# The-Fusion-Engine

> **Note:** Full refined documentation is being applied. See PR for complete content.

## Temporary notice

The complete README update (57 KB refined bilingual blueprint) follows in the next commit.

The Fusion Engine: Quick Start Guide
This guide provides the minimal steps to bootstrap a self-hosted, sovereign Bitcoin and Lightning data infrastructure using The Fusion Engine.
1. Prerequisites
Node.js: v20+ LTS
Bitcoin Core: v27+ (with txindex=1 and server=1 enabled)
Operating System: Compatible with Linux (RHEL/Ubuntu), macOS Silicon, or Windows x64.
2. Installation
# Clone the repository
git clone https://github.com/GizzZmo/The-Fusion-Engine
cd The-Fusion-Engine

# Install dependencies
npm install

# Build the cross-platform binary
npm run build
    
3. Node Configuration
Ensure your bitcoin.conf contains the following essential settings:
txindex=1
server=1
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
rpcauth=fusion_admin:[YOUR_GENERATED_HASH]
    
4. Environment Setup
Create a .env file in the root directory:
BITCOIN_RPC_USER=fusion_admin
BITCOIN_RPC_PASS=[YOUR_PASSWORD]
WS_PORT=8080
SSL_CERT_PATH=./certs/server.cert
SSL_KEY_PATH=./certs/server.key
FUSION_SECURE_TOKEN=[GENERATE_SECURE_RANDOM_TOKEN]
    
5. Launching the Engine
# Start the production-ready service
node dist/index.js
    
6. Integration & Verification
Once launched, the engine will initialize the WAL-optimized SQLite store and begin streaming mempool telemetry. Connect your frontend dashboard to the secure WebSocket endpoint:
wss://your-domain.local:8080?token=[FUSION_SECURE_TOKEN]

