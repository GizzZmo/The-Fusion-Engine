# The-Fusion-Engine
Detailed Code Implementation: The Fusion Engine To complete the blueprint, this section provides the operational modules required to power the Fusion architecture, moving from raw transaction stream ingestion to real-time WebSocket broadcasting.

The Mempool Open Source Project (mempool.space) utilizes the **GNU Affero General Public License version 3 (AGPL-3.0)** for its software. This license is a "strong copyleft" license specifically designed to close the "ASP loophole," ensuring that if you modify the software and provide access to it over a network, you must make the source code available to your users.

Other notable projects licensed under AGPL-3.0 include:

* **Mastodon** (Decentralized social networking)
* **Nextcloud** (Private cloud storage/collaboration)
* **Grafana** (Analytics and interactive visualization platform)
* **Bitwarden** (Server-side code for password management)
* **SearXNG** (Privacy-respecting metasearch engine)

---

# Blueprint: The Fusion Architecture

**Author:** Jon Constantine

### Abstract

The Fusion Architecture represents a synthesis of high-performance Bitcoin data infrastructure and modular, privacy-centric user interfaces. By leveraging the principles of the AGPL-3.0, this blueprint outlines a self-hosted, decentralized ecosystem that allows for enterprise-grade throughput while maintaining sovereign control over data.

### Introduction

The shift from centralized API dependencies to local-first, verifiable infrastructure is the next evolution in financial technology. This document details the implementation of "Fusion"—a framework for aggregating network telemetry, blockchain state, and localized wallet interfaces.

### Index

1. **System Foundations**
2. **Node Integration**
3. **Telemetry & Mempool Indexing**
4. **Local-First Database Strategy**
5. **Reactive API Layer**
6. **Security & Hardening**
7. **Enterprise Scaling**
8. **Frontend Synchronization**

* *Summary (Chapters 1-8)*

9. **Advanced Analytics**
10. **Mining & Hasrate Tracking**
11. **Multi-Layer Connectivity**
12. **Automation & Acceleration**
13. **Policy & Compliance**
14. **Custom Co-Branding**
15. **Support & Maintenance**
16. **Future Roadmap**

* *Summary (Chapters 9-16)*

---

### Chapters 1-8: The Core Infrastructure

* **Chapters 1-4:** Focus on the "Back-end Sovereign." Establishing the Bitcoin Core connection, the RPC interface for low-latency indexing, and the MariaDB/NodeJS stack configuration required for localized performance.
* **Chapters 5-8:** Detail the creation of the reactive WebSocket layer and internal APIs, enabling push-updates for transaction status and balance monitoring.

**Summary (1-8):** These chapters establish a secure, self-hosted base that mimics professional-grade infrastructure while ensuring the user retains full ownership of their node data.

---

### Chapters 9-16: Optimization & Ecosystem

* **Chapters 9-12:** Cover advanced features like block-reward tracking, transaction acceleration, and Lightning network monitoring.
* **Chapters 13-16:** Address enterprise requirements: SLAs, custom subdomains, and the maintenance of the AGPL-3.0 compliance environment.

**Summary (9-16):** These chapters transform the core node from a passive observer into an active financial instrument, providing the tools for advanced ecosystem participation.

---

### How-To: Implementation (Code Example)

To initialize the backend indexing service (conceptual foundation):

```typescript
// backend/src/indexer.ts
import { Client } from 'bitcoin-core';
import { Database } from './db';

const client = new Client({
  host: '127.0.0.1',
  port: 8332,
  username: 'mempool',
  password: 'your-secure-password'
});

async function syncMempool() {
  const txs = await client.getRawMempool();
  for (const txid of txs) {
    const tx = await client.getRawTransaction(txid, true);
    await Database.saveTransaction(tx);
    console.log(`Indexed: ${txid}`);
  }
}

setInterval(syncMempool, 5000);

```

**Deployment Checklist:**

1. **Node:** Bitcoin Core with `txindex=1` and `server=1`.

---

## Chapter 1: System Foundations & Sovereign Architecture

To build a production-grade Bitcoin data infrastructure that operates entirely under your own sovereign control, you must first dismantle the reliance on centralized third-party endpoints. The **Fusion Architecture** relies on a three-tier localized stack: the underlying consensus engine (Bitcoin Core), the high-performance indexing layer, and the real-time presentation layer.

### Architectural Schematic (How-To Picture)

The following ASCII diagram illustrates the data pipeline from the Bitcoin P2P network down to the client dashboard:

```text
 +-------------------------------------------------------+
 |               Bitcoin P2P Network                     |
 +---------------------------+---------------------------+
                             | Block / Tx Stream
                             v
 +-------------------------------------------------------+
 |              Bitcoin Core Node (v27+)                 |
 |       - txindex=1   - server=1   - rpcauth            |
 +---------------------------+---------------------------+
                             | ZeroMQ & JSON-RPC
                             v
 +-------------------------------------------------------+
 |               Fusion Indexer Engine                   |
 |     (TypeScript / Better-SQLite3 / Custom Buffer)     |
 +-------+---------------------------------------+-------+
         |                                       |
         v (Indexed Local Cache)                 v (Push Telemetry)
 +-------+-----------------------+     +---------+---------------+
 |      SQLite Storage           |     |    WebSocket Server     |
 |  - Transactions & Fees        |     |  - Real-time Subscriptions|
 +-------------------------------+     +---------+---------------+
                                                 |
                                                 v
                                       +---------+---------------+
                                       |   Frontend Client App   |
                                       |  - Live Mempool UI      |
                                       +-------------------------+

```

---

## Chapter 2: Node Integration & RPC Tunneling

Before any indexing can occur, your Bitcoin Core instance must be tuned for high-throughput data extraction. Default configurations discard memory pool telemetry and lack the historical transaction indexing required for real-time analytics.

### 1. Configuring `bitcoin.conf`

Create or update your node configuration file to enable zero-dependency indexing and RPC authentication:

```ini
# /etc/bitcoin/bitcoin.conf

# Network and Connection settings
server=1
daemon=1
listen=1
maxconnections=125

# Required for historical lookups and mempool analysis
txindex=1

# ZeroMQ notifications for instant block and transaction alerts
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333

# RPC Credentials (Replace with secure hash generated via rpcauth.py)
rpcauth=fusion_admin:4c28f...39a
rpcallowip=127.0.0.1
rpcport=8332

```

### 2. High-Performance RPC Client Integration

To interface directly with the tuned node without dropping packets, implement a persistent HTTP agent pool in your TypeScript indexing daemon.

```typescript
// backend/src/rpc-client.ts
import http from 'http';

interface RPCRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params: any[];
}

export class BitcoinRPC {
  private host: string;
  private port: number;
  private authHeader: string;
  private agent: http.Agent;

  constructor(host = '127.0.0.1', port = 8332, user: string, pass: string) {
    this.host = host;
    this.port = port;
    this.authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
    
    // Maintain persistent socket connections to avoid overhead
    this.agent = new http.Agent({ keepAlive: true, maxSockets: 50 });
  }

  public async call<T>(method: string, params: any[] = []): Promise<T> {
    const payload: RPCRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    const data = JSON.stringify(payload);

    const options: http.RequestOptions = {
      hostname: this.host,
      port: this.port,
      path: '/',
      method: 'POST',
      agent: this.agent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.error) {
              reject(new Error(`RPC Error [${response.error.code}]: ${response.error.message}`));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            reject(new Error(`Failed to parse RPC response: ${body}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(data);
      req.end();
    });
  }
}

```

---

## Illustration Concept: The Sovereign Node Cluster

> **Visual Asset Specification (For AI Generation / Documentation Graphics):**
> * **Style:** Cyberpunk-minimalist technical blueprint, dark slate background (`#0B0F19`), neon cyan (`#00F2FE`) and emerald green (`#10B981`) vector traces.
> * **Subject:** A stylized isometric cluster of 3 bare-metal rack servers connected by glowing fiber pathways labeled "ZeroMQ Pipe," terminating at a central dashboard interface showing real-time mempool fee distributions.
> * **Typography:** Monospace headers with technical grid overlays.
3. **Database:** MariaDB/MySQL with optimized schema indexing for transaction lookups.
4. **License Compliance:** Ensure any proprietary UI extensions or API modifications remain compliant with AGPL-3.0 by serving your source code alongside the interface.
>
> ---

## Chapter 3: Telemetry & Mempool Indexing

While the JSON-RPC interface handles active queries and historical lookups, real-time mempool telemetry requires an event-driven pipeline. Relying on continuous polling (`getrawmempool`) introduces unnecessary network latency and CPU overhead. By hooking directly into Bitcoin Core's **ZeroMQ (ZMQ)** message publishing socket, the Fusion engine captures raw transaction broadcasts the microsecond they hit the node's memory pool.

### ZeroMQ Architectural Flow

```text
 +-------------------------------------------------------+
 |                 Bitcoin Core Node                     |
 |        Publishes to: tcp://127.0.0.1:28333            |
 +---------------------------+---------------------------+
                             | ZMQ `rawtx` Byte Stream
                             v
 +-------------------------------------------------------+
 |                Fusion ZMQ Subscriber                  |
 |  - Buffer Decoders   - Varint Parsers   - TxID Hash   |
 +---------------------------+---------------------------+
                             | Decoded Transaction Object
                             v
 +-------------------------------------------------------+
 |               Local SQLite Ingestion                  |
 +-------------------------------------------------------+

```

### Complete Code Implementation: ZeroMQ Mempool Ingestion Daemon

To ingest raw byte streams from Bitcoin Core using Node.js, we implement a persistent ZMQ socket listener that decodes incoming raw transactions and extracts core metrics (fee, size, witness data).

```typescript
// backend/src/zmq-listener.ts
import zmq from 'zeromq';
import { BitcoinRPC } from './rpc-client';
import { Storage } from './db';

export class MempoolStreamListener {
  private sock: zmq.Subscriber;
  private rpc: BitcoinRPC;
  private endpoint: string;

  constructor(rpcClient: BitcoinRPC, zmqEndpoint = 'tcp://127.0.0.1:28333') {
    this.sock = new zmq.Subscriber();
    this.rpc = rpcClient;
    this.endpoint = zmqEndpoint;
  }

  public async start() {
    this.sock.connect(this.endpoint);
    this.sock.subscribe('rawtx');
    console.log(`[ZMQ] Listening for raw transactions on ${this.endpoint}...`);

    for await (const [topic, msg] of this.sock) {
      if (topic.toString() === 'rawtx') {
        await this.handleRawTransaction(msg);
      }
    }
  }

  private async handleRawTransaction(buffer: Buffer) {
    try {
      const rawHex = buffer.toString('hex');
      
      // Decode transaction metadata via Bitcoin RPC decoder
      const decodedTx: any = await this.rpc.call('decoderawtransaction', [rawHex]);
      const txid = decodedTx.txid;
      const size = decodedTx.size;
      
      // Calculate or fetch fee (if available via mempool entry or custom calculation)
      const mempoolEntry: any = await this.rpc.call('getmempoolentry', [txid]).catch(() => null);
      const fee = mempoolEntry ? Math.round(mempoolEntry.fee * 100000000) : 0; // Converted to Sats

      // Persist directly to local SQLite storage
      Storage.saveTransaction(txid, fee, size, JSON.stringify(decodedTx));
      console.log(`[Indexed] TxID: ${txid} | Size: ${size} bytes | Fee: ${fee} sats`);
    } catch (err: any) {
      console.error(`[ZMQ Error] Failed to parse transaction: ${err.message}`);
    }
  }
}

```

---

## Chapter 4: Local-First Database Strategy

High-frequency blockchain indexing requires a database engine optimized for rapid write operations, low resource consumption, and zero external service dependencies. The Fusion architecture utilizes **Better-SQLite3** configured in Write-Ahead Logging (WAL) mode to allow concurrent reads while batch-writing real-time telemetry.

### Performance Tuning & WAL Configuration

By default, standard SQLite installations lock tables during write operations. Enabling WAL mode and adjusting synchronous flags drastically increases transaction throughput.

### Complete Code Implementation: Optimized Storage Engine

```typescript
// backend/src/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../fusion_core.db');
const db = new Database(dbPath);

// Enable high-performance Write-Ahead Logging and cache tuning
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // Allocate ~64MB RAM for query caching

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      txid TEXT PRIMARY KEY,
      fee INTEGER,
      size INTEGER,
      feerate REAL,
      received_at INTEGER,
      raw_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_feerate ON transactions(feerate DESC);
    CREATE INDEX IF NOT EXISTS idx_received ON transactions(received_at DESC);
  `);
  console.log('[Database] Fusion core storage initialized with WAL optimization.');
}

export const Storage = {
  saveTransaction(txid: string, fee: number, size: number, rawJson: string) {
    const feerate = size > 0 ? fee / size : 0;
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO transactions (txid, fee, size, feerate, received_at, raw_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(txid, fee, size, feerate, Date.now(), rawJson);
  },

  getMempoolStats() {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(size) as total_size,
        AVG(feerate) as avg_feerate
      FROM transactions
    `);
    return stmt.get();
  },

  getRecentTransactions(limit: number = 25) {
    const stmt = db.prepare(`
      SELECT txid, fee, size, feerate, received_at 
      FROM transactions 
      ORDER BY received_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }
};

```
