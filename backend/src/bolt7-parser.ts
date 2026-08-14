import { Buffer } from 'buffer';

export interface ChannelAnnouncement {
  type: 256;
  nodeSignature1: Buffer;
  nodeSignature2: Buffer;
  bitcoinSignature1: Buffer;
  bitcoinSignature2: Buffer;
  features: Buffer;
  chainHash: Buffer;
  shortChannelId: string;
  nodeId1: string;
  nodeId2: string;
  bitcoinKey1: string;
  bitcoinKey2: string;
}

export interface NodeAnnouncement {
  type: 257;
  signature: Buffer;
  features: Buffer;
  timestamp: number;
  nodeId: string;
  rgbColor: string;
  alias: string;
  addresses: Array<{ type: number; host: string; port: number }>;
}

export interface ChannelUpdate {
  type: 258;
  signature: Buffer;
  chainHash: Buffer;
  shortChannelId: string;
  timestamp: number;
  messageFlags: number;
  channelFlags: number;
  direction: 0 | 1;
  isDisabled: boolean;
  cltvExpiryDelta: number;
  htlcMinimumMsat: bigint;
  feeBaseMsat: number;
  feeProportionalMillionths: number;
  htlcMaximumMsat: bigint;
}

export type GossipMessage = ChannelAnnouncement | NodeAnnouncement | ChannelUpdate;

/**
 * Sequential BOLT 7 gossip message parser.
 * Handles variable-length features and address lists correctly.
 * Message types (BOLT #7):
 *   256 = channel_announcement
 *   257 = node_announcement
 *   258 = channel_update
 */
export class Bolt7Parser {
  private buf: Buffer;
  private offset = 0;

  constructor(buf: Buffer) {
    this.buf = buf;
  }

  private ensure(bytes: number) {
    if (this.offset + bytes > this.buf.length) {
      throw new Error(
        `Buffer underrun at offset ${this.offset}, need ${bytes} more bytes`
      );
    }
  }

  private readU8(): number {
    this.ensure(1);
    const v = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }

  private readU16(): number {
    this.ensure(2);
    const v = this.buf.readUInt16BE(this.offset);
    this.offset += 2;
    return v;
  }

  private readU32(): number {
    this.ensure(4);
    const v = this.buf.readUInt32BE(this.offset);
    this.offset += 4;
    return v;
  }

  private readU64(): bigint {
    this.ensure(8);
    const v = this.buf.readBigUInt64BE(this.offset);
    this.offset += 8;
    return v;
  }

  private readBytes(len: number): Buffer {
    this.ensure(len);
    const slice = this.buf.subarray(this.offset, this.offset + len);
    this.offset += len;
    return slice;
  }

  private readPoint(): string {
    return this.readBytes(33).toString('hex');
  }

  private readSignature(): Buffer {
    return this.readBytes(64);
  }

  /** Parse a complete gossip message that still has the 2-byte type prefix. */
  parse(hasTypePrefix = true): GossipMessage {
    let type: number;

    if (hasTypePrefix) {
      type = this.readU16();
    } else {
      throw new Error(
        'When hasTypePrefix=false call the specific parse* methods directly'
      );
    }

    switch (type) {
      case 256:
        return this.parseChannelAnnouncement();
      case 257:
        return this.parseNodeAnnouncement();
      case 258:
        return this.parseChannelUpdate();
      default:
        throw new Error(`Unsupported gossip type ${type}`);
    }
  }

  // ─────────────────────────────────────────────
  // 256 – channel_announcement
  // ─────────────────────────────────────────────
  parseChannelAnnouncement(): ChannelAnnouncement {
    const nodeSignature1 = this.readSignature();
    const nodeSignature2 = this.readSignature();
    const bitcoinSignature1 = this.readSignature();
    const bitcoinSignature2 = this.readSignature();

    const featuresLen = this.readU16();
    const features = this.readBytes(featuresLen);

    const chainHash = this.readBytes(32);
    const shortChannelId = this.readU64().toString();

    const nodeId1 = this.readPoint();
    const nodeId2 = this.readPoint();
    const bitcoinKey1 = this.readPoint();
    const bitcoinKey2 = this.readPoint();

    return {
      type: 256,
      nodeSignature1,
      nodeSignature2,
      bitcoinSignature1,
      bitcoinSignature2,
      features,
      chainHash,
      shortChannelId,
      nodeId1,
      nodeId2,
      bitcoinKey1,
      bitcoinKey2,
    };
  }

  // ─────────────────────────────────────────────
  // 257 – node_announcement
  // ─────────────────────────────────────────────
  parseNodeAnnouncement(): NodeAnnouncement {
    const signature = this.readSignature();

    const featuresLen = this.readU16();
    const features = this.readBytes(featuresLen);

    const timestamp = this.readU32();
    const nodeId = this.readPoint();

    const rgb = this.readBytes(3);
    const rgbColor = `#${rgb.toString('hex')}`;

    const aliasRaw = this.readBytes(32);
    const alias = aliasRaw.toString('utf8').replace(/\0+$/, '');

    const addrLen = this.readU16();
    const addressesBuf = this.readBytes(addrLen);
    const addresses = this.parseAddresses(addressesBuf);

    return {
      type: 257,
      signature,
      features,
      timestamp,
      nodeId,
      rgbColor,
      alias,
      addresses,
    };
  }

  private parseAddresses(buf: Buffer): NodeAnnouncement['addresses'] {
    const result: NodeAnnouncement['addresses'] = [];
    let i = 0;

    while (i < buf.length) {
      const type = buf.readUInt8(i);
      i += 1;

      try {
        switch (type) {
          case 1: {
            // IPv4
            if (i + 6 > buf.length) break;
            const host = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`;
            const port = buf.readUInt16BE(i + 4);
            result.push({ type, host, port });
            i += 6;
            break;
          }
          case 2: {
            // IPv6
            if (i + 18 > buf.length) break;
            const parts: string[] = [];
            for (let j = 0; j < 16; j += 2) {
              parts.push(buf.readUInt16BE(i + j).toString(16));
            }
            const host = parts.join(':');
            const port = buf.readUInt16BE(i + 16);
            result.push({ type, host, port });
            i += 18;
            break;
          }
          case 4: {
            // Tor v3
            if (i + 37 > buf.length) break;
            const onion = buf.subarray(i, i + 35).toString('base64url');
            const port = buf.readUInt16BE(i + 35);
            result.push({ type, host: `${onion}.onion`, port });
            i += 37;
            break;
          }
          case 5: {
            // DNS hostname
            if (i + 1 > buf.length) break;
            const hostLen = buf.readUInt8(i);
            i += 1;
            if (i + hostLen + 2 > buf.length) break;
            const host = buf.subarray(i, i + hostLen).toString('utf8');
            const port = buf.readUInt16BE(i + hostLen);
            result.push({ type, host, port });
            i += hostLen + 2;
            break;
          }
          default:
            // Unknown type – stop parsing remaining addresses
            return result;
        }
      } catch {
        break;
      }
    }

    return result;
  }

  // ─────────────────────────────────────────────
  // 258 – channel_update
  // ─────────────────────────────────────────────
  parseChannelUpdate(): ChannelUpdate {
    const signature = this.readSignature();
    const chainHash = this.readBytes(32);
    const shortChannelId = this.readU64().toString();
    const timestamp = this.readU32();

    const messageFlags = this.readU8();
    const channelFlags = this.readU8();

    const direction = (channelFlags & 0x01) as 0 | 1;
    const isDisabled = (channelFlags & 0x02) !== 0;

    const cltvExpiryDelta = this.readU16();
    const htlcMinimumMsat = this.readU64();
    const feeBaseMsat = this.readU32();
    const feeProportionalMillionths = this.readU32();
    const htlcMaximumMsat = this.readU64();

    return {
      type: 258,
      signature,
      chainHash,
      shortChannelId,
      timestamp,
      messageFlags,
      channelFlags,
      direction,
      isDisabled,
      cltvExpiryDelta,
      htlcMinimumMsat,
      feeBaseMsat,
      feeProportionalMillionths,
      htlcMaximumMsat,
    };
  }
}
