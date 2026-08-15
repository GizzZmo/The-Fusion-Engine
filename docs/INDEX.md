# Fusion Architecture — Index

Bilingual table of contents for the Fusion Engine blueprint.

Full Norwegian overview: [`BLUEPRINT_NO.md`](BLUEPRINT_NO.md)

---

## Part 1 — Foundations *(Del 1: Fundamentet)*

| # | English | Norsk |
|---|---------|-------|
| 1 | **System Foundations & Sovereignty** | Systemfilosofi og Suverenitet |
| 2 | **Node Integration & RPC Tunneling** | Node-integrasjon og RPC-tunnelering |
| 3 | **Telemetry & Mempool Indexing** | Telemetri og Mempool-indeksering |
| 4 | **Local-First Database Strategy (WAL)** | Lokal Database-strategi (WAL) |

Local-first sovereignty, Bitcoin Core tuning (`txindex`, ZeroMQ), high-performance RPC, and WAL-optimized SQLite for concurrent read/write telemetry.

---

## Part 2 — Expansion & Lightning *(Del 2: Utvidelse og Lightning)*

| # | English | Norsk |
|---|---------|-------|
| 5 | **Reactive API Layer** | Reaktiv API-arkitektur |
| 6 | **Cross-Platform Compilation** | Plattformuavhengighet |
| 7 | **Lightning Gossip & Topology** (sequential BOLT 7 parser) | Lightning-Gossip og Topologi |
| 8 | **Security, Hardening & TLS** | Sikkerhet, Herding og TLS |

Event-driven WebSocket API, cross-platform binaries, sequential BOLT 7 gossip parser (channel graph + fee policies), and TLS-hardened token-authenticated transport.

**Chapter 7 source:**
- [`backend/src/bolt7-parser.ts`](../backend/src/bolt7-parser.ts)
- [`backend/src/lightning-gossip-engine.ts`](../backend/src/lightning-gossip-engine.ts)

Message types: `256` channel_announcement · `257` node_announcement · `258` channel_update

---

## Part 3 — Advanced Analytics & Operations *(Del 3: Avansert Analyse og Drift)*

| # | English | Norsk |
|---|---------|-------|
| 9 | **Advanced Analytics & Fee Histograms** | Avansert Analyse og Histogrammer |
| 10 | **Mining & Hashrate Tracking** | Gruvedrift og Hashrate-innsikt |
| 11 | **Multi-Layer Connectivity** | Multi-lagstilkobling |
| 12 | **Accelerator Pro (CPFP/RBF)** | Accelerator Pro |
| 13 | **Policy & Compliance** | Governance og Compliance |
| 14 | **Dynamic Multi-Tenancy & Co-Branding** | Dynamisk Multi-tenancy |
| 15 | **Support, Maintenance & Self-Healing** | SLA og Vedlikehold |
| 16 | **Future Roadmap (Nostr / ZK)** | Fremtid og Nostr-integrasjon |

Fee histograms & queue prediction, mining/hashrate insight, multi-layer (UTXO ↔ channel) correlation, Accelerator Pro, SOC2 audit logs, hostname theming, watchdog self-healing, and future Nostr + ZK proofs.

---

## Summary

| Part | Chapters | Outcome |
|------|----------|---------|
| 1 Foundations | 1–4 | Sovereign local-first data plane |
| 2 Expansion & Lightning | 5–8 | Real-time API + BOLT 7 topology + TLS |
| 3 Analytics & Operations | 9–16 | Enterprise tooling, compliance, multi-tenancy |

*Fusion transforms a raw Bitcoin node into an enterprise-ready, sovereign infrastructure for on-chain and Lightning data.*
