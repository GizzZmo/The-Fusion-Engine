import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import path from 'path';
import {
  Bolt7Parser,
  ChannelAnnouncement,
  ChannelUpdate,
  NodeAnnouncement,
} from './bolt7-parser';

export class LightningGossipEngine extends EventEmitter {
  private db: Database.Database;

  constructor(
    dbPath: string = path.resolve(__dirname, '../fusion_lightning.db')
  ) {
    super();
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ln_nodes (
        node_id TEXT PRIMARY KEY,
        alias TEXT,
        addresses TEXT,
        last_seen INTEGER
      );

      CREATE TABLE IF NOT EXISTS ln_channels (
        short_channel_id TEXT PRIMARY KEY,
        node_id_1 TEXT,
        node_id_2 TEXT,
        fee_base_1 INTEGER DEFAULT 0,
        fee_ppm_1 INTEGER DEFAULT 0,
        fee_base_2 INTEGER DEFAULT 0,
        fee_ppm_2 INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        updated_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_active_channels ON ln_channels(is_active);
    `);
    console.log('[Lightning Gossip] SQLite topology tables initialized.');
  }

  /**
   * Process a raw gossip payload.
   * @param type    BOLT message type (256 / 257 / 258)
   * @param buffer  Payload bytes (type already stripped by the transport layer)
   */
  public processGossipPacket(type: number, buffer: Buffer) {
    try {
      const parser = new Bolt7Parser(buffer);

      switch (type) {
        case 256: {
          const msg = parser.parseChannelAnnouncement();
          this.handleChannelAnnouncement(msg);
          break;
        }
        case 257: {
          const msg = parser.parseNodeAnnouncement();
          this.handleNodeAnnouncement(msg);
          break;
        }
        case 258: {
          const msg = parser.parseChannelUpdate();
          this.handleChannelUpdate(msg);
          break;
        }
        default:
          // Unhandled or control message types
          break;
      }
    } catch (err: any) {
      console.error(
        `[Gossip Error] Failed to process packet type ${type}: ${err.message}`
      );
    }
  }

  private handleChannelAnnouncement(msg: ChannelAnnouncement) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ln_channels
        (short_channel_id, node_id_1, node_id_2, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(msg.shortChannelId, msg.nodeId1, msg.nodeId2, Date.now());

    this.emit('channel_discovered', {
      shortChannelId: msg.shortChannelId,
      nodeId1: msg.nodeId1,
      nodeId2: msg.nodeId2,
    });
  }

  private handleChannelUpdate(msg: ChannelUpdate) {
    // direction 0 → node_id_1 side, direction 1 → node_id_2 side
    const baseCol = msg.direction === 0 ? 'fee_base_1' : 'fee_base_2';
    const ppmCol = msg.direction === 0 ? 'fee_ppm_1' : 'fee_ppm_2';

    const stmt = this.db.prepare(`
      UPDATE ln_channels
      SET ${baseCol} = ?, ${ppmCol} = ?, is_active = ?, updated_at = ?
      WHERE short_channel_id = ?
    `);

    stmt.run(
      msg.feeBaseMsat,
      msg.feeProportionalMillionths,
      msg.isDisabled ? 0 : 1,
      Date.now(),
      msg.shortChannelId
    );

    this.emit('fee_policy_updated', {
      shortChannelId: msg.shortChannelId,
      direction: msg.direction,
      feeBaseMsat: msg.feeBaseMsat,
      feeProportionalMillionths: msg.feeProportionalMillionths,
      isDisabled: msg.isDisabled,
      cltvExpiryDelta: msg.cltvExpiryDelta,
      htlcMinimumMsat: msg.htlcMinimumMsat.toString(),
      htlcMaximumMsat: msg.htlcMaximumMsat.toString(),
    });
  }

  private handleNodeAnnouncement(msg: NodeAnnouncement) {
    const stmt = this.db.prepare(`
      INSERT INTO ln_nodes (node_id, alias, addresses, last_seen)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(node_id) DO UPDATE SET
        alias = excluded.alias,
        addresses = excluded.addresses,
        last_seen = excluded.last_seen
    `);

    stmt.run(
      msg.nodeId,
      msg.alias,
      JSON.stringify(msg.addresses),
      msg.timestamp * 1000
    );

    this.emit('node_updated', {
      nodeId: msg.nodeId,
      alias: msg.alias,
      addresses: msg.addresses,
      rgbColor: msg.rgbColor,
    });
  }

  public getNetworkTopologySummary() {
    const nodeCount = this.db
      .prepare(`SELECT COUNT(*) as count FROM ln_nodes`)
      .get() as { count: number };
    const channelCount = this.db
      .prepare(`SELECT COUNT(*) as count FROM ln_channels WHERE is_active = 1`)
      .get() as { count: number };

    return {
      totalNodes: nodeCount.count,
      activeChannels: channelCount.count,
      timestamp: Date.now(),
    };
  }
}
