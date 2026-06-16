<div align="center">

```
███████╗ ██████╗ ██╗     ██████╗  ██████╗ ███╗   ███╗██████╗ 
██╔════╝██╔═══██╗██║     ██╔══██╗██╔═══██╗████╗ ████║██╔══██╗
███████╗██║   ██║██║     ██████╔╝██║   ██║██╔████╔██║██████╔╝
╚════██║██║   ██║██║     ██╔══██╗██║   ██║██║╚██╔╝██║██╔══██╗
███████║╚██████╔╝███████╗██████╔╝╚██████╔╝██║ ╚═╝ ██║██████╔╝
╚══════╝ ╚═════╝ ╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝╚═════╝ 
```

### 💣 The Explosive Memecoin Launchpad on Solana

[![Program](https://img.shields.io/badge/Program-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solscan.io/account/ChsZQgo5Z6JpUnupLwRkNm7R2ahyggCsYNo7BP3TMQeJ?cluster=devnet)
[![App](https://img.shields.io/badge/App-Live-00D4FF?style=for-the-badge&logo=vercel&logoColor=white)](https://app.solbomb.xyz)
[![Twitter](https://img.shields.io/badge/Twitter-@solbombxyz-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://x.com/solbombxyz)
[![Telegram](https://img.shields.io/badge/Telegram-@solbomb-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/solbomb)
[![Whitepaper](https://img.shields.io/badge/Whitepaper-Read-FF006E?style=for-the-badge&logo=gitbook&logoColor=white)](https://solbombwhitepaper.netlify.app)

-----

*Launch fast. Pump hard. Graduate to the moon.* 🚀

</div>

-----

## 💥 What is SolBomb?

**SolBomb** is a next-generation memecoin launchpad built on **Solana** — engineered for speed, fairness, and explosive price discovery.

Inspired by pump.fun but built with a stronger architecture, SolBomb enables anyone to launch a token in seconds with a **constant product bonding curve (x·y=k)**, automatic graduation to DEX, and a full ecosystem of tools for traders and creators.

> *No presale manipulation. No team allocations. Just pure bonding curve mechanics.*

-----

## ⚡ Core Features

|Feature                |Description                           |
|-----------------------|--------------------------------------|
|💣 **Instant Launch**   |Deploy a token in under 60 seconds    |
|📈 **Bonding Curve**    |x·y=k constant product formula        |
|🎓 **Auto Graduation**  |Migrate to Raydium at 85 SOL          |
|🔒 **Anti-Rug**         |Locked liquidity at graduation        |
|👤 **On-Chain Profiles**|Track your launched tokens            |
|📊 **Live Charts**      |Real-time candlestick trading view    |
|💎 **Founder Pass NFT** |100 genesis NFTs for early supporters |
|🏦 **Presale Module**   |Tiered crowdfunding with auto-delivery|

-----

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SOLBOMB PROTOCOL                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   USER ──► LAUNCH ──► BONDING CURVE ──► BUY/SELL       │
│                              │                          │
│                         85 SOL reached                  │
│                              │                          │
│                              ▼                          │
│                    GRADUATION ──► RAYDIUM DEX           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   Program ID: ChsZQgo5Z6JpUnupLwRkNm7R2ahyggCsYNo7BP3TMQeJ  │
│   Network: Solana Devnet → Mainnet Soon                 │
└─────────────────────────────────────────────────────────┘
```

-----

## 📐 Bonding Curve Formula

```
BUY:
  fee        = sol_in × FEE_BPS / 10000
  net_sol_in = sol_in - fee
  tokens_out = vTokenReserves - (vSolReserves × vTokenReserves) / (vSolReserves + net_sol_in)

SELL:
  sol_gross  = vSolReserves - (vSolReserves × vTokenReserves) / (vTokenReserves + token_in)
  fee        = sol_gross × FEE_BPS / 10000
  net_sol    = sol_gross - fee

PRICE:
  price = vSolReserves / vTokenReserves

CURVE %:
  progress = realSolReserves / 85_000_000_000 × 100
```

-----

## 🔑 Program Constants

```rust
VIRTUAL_SOL_RESERVES  = 30_000_000_000   // 30 SOL
TOTAL_SUPPLY          = 1_000_000_000_000_000  // 1 quadrillion
GRADUATION_SOL        = 85_000_000_000   // 85 SOL
FEE_BPS               = 100             // 1%
TOKEN_DECIMALS        = 6
```

-----

## 🗂️ On-Chain Account Layout

```
BondingCurve Account:
┌────────────────────────────────────────┐
│ [0-7]    discriminator    (8 bytes)    │
│ [8-39]   mint             (32 bytes)   │
│ [40-71]  creator          (32 bytes)   │
│ [72-79]  virtual_sol      (u64)        │
│ [80-87]  virtual_tokens   (u64)        │
│ [88-95]  real_sol         (u64)        │
│ [96-103] real_tokens      (u64)        │
│ [104-111] total_supply    (u64)        │
│ [112]    graduated        (bool)       │
│ [113+]   name, symbol     (String)     │
└────────────────────────────────────────┘
```

-----

## 🧩 Instruction Discriminators

```javascript
launch : [153, 241,  93, 225,  22,  69,  74,  61]
buy    : [102,   6,  61,  18,   1, 218, 235, 234]
sell   : [ 51, 230, 133, 164,   1, 127, 131, 173]
```

-----

## 🚀 PDA Seeds

```
config        → ["config"]
bonding_curve → ["curve", mint]
sol_vault     → ["sol_vault", mint]
token_vault   → ATA(mint, bondingCurve)
```

-----

## 💎 Founder Pass NFT

```
Collection : SolBomb Founder Pass
Symbol     : SBFP
Supply     : 100 (Genesis Only)
Price      : 1 SOL
Standard   : Metaplex + Candy Machine v3
Limit      : 1 per wallet
```

> *Own a piece of SolBomb history. Limited to 100 founding supporters.*
> *Unlock milestone rewards as the ecosystem grows.*

-----

## 💰 Presale Tiers

|Tier     |Price  |$SOLBOMB Allocation|
|---------|-------|-------------------|
|🥉 Bronze |0.5 SOL|5,000 BOMB         |
|🥈 Silver |2 SOL  |25,000 BOMB        |
|🥇 Gold   |5 SOL  |75,000 BOMB        |
|💎 Diamond|10 SOL |200,000 BOMB       |

```
Soft Cap  : 200 SOL
Duration  : 7 Days
Refund    : Auto if soft cap not reached
Delivery  : Auto after presale closes
```

-----

## 🛠️ Tech Stack

```
Smart Contract  → Rust + Anchor Framework
Frontend        → React + Vite + TailwindCSS
Wallet          → Phantom (Wallet Standard)
RPC             → Solana Devnet
Metadata        → Metaplex + Pinata IPFS
Deployment      → Netlify + Vercel
CI/CD           → GitHub → Auto Deploy
```

-----

## 📁 Repository Structure

```
solbomb/
├── src/
│   └── App.jsx          # Single-file React app
├── public/
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

-----

## 🗺️ Roadmap

```
Phase 1 — Devnet ████████████████░░░░ 80%
  ✅ Smart contract deploy
  ✅ Launch / Buy / Sell tested
  ✅ Frontend app live
  ✅ Founder Pass NFT minted
  ✅ Presale module
  🔄 Board persistence
  🔄 Candlestick charts
  🔄 Social links

Phase 2 — Mainnet Prep ████░░░░░░░░░░░░░░░░ 20%
  ⏳ Metaplex metadata integration
  ⏳ Pinata image upload
  ⏳ Anti-rug mechanisms
  ⏳ Token vesting
  ⏳ $2 USD minting fee in $SOLBOMB

Phase 3 — Mainnet Launch 🔜
  ⏳ Mainnet deployment
  ⏳ Raydium graduation live
  ⏳ SOLBOMB token TGE
  ⏳ DAO governance

Phase 4 — Ecosystem Growth 🔜
  ⏳ Mobile PWA
  ⏳ Phantom deep links
  ⏳ Launchpad partnerships
  ⏳ Community grants
```

-----

## 🔗 Links

|Resource    |URL                                                                                                     |
|------------|--------------------------------------------------------------------------------------------------------|
|🌐 App       |[app.solbomb.xyz](https://app.solbomb.xyz)                                                              |
|📄 Whitepaper|[solbombwhitepaper.netlify.app](https://solbombwhitepaper.netlify.app)                                  |
|🎯 Presale   |[solbombpresale.netlify.app](https://solbombpresale.netlify.app)                                        |
|🐦 Twitter   |[@solbombxyz](https://x.com/solbombxyz)                                                                 |
|💬 Telegram  |[@solbomb](https://t.me/solbomb)                                                                        |
|🔍 Program   |[Solscan Devnet](https://solscan.io/account/ChsZQgo5Z6JpUnupLwRkNm7R2ahyggCsYNo7BP3TMQeJ?cluster=devnet)|

-----

## ⚠️ Disclaimer

SolBomb is currently deployed on **Solana Devnet** for testing purposes. All SOL used is test SOL with no real monetary value. Mainnet launch details will be announced via official channels only.

-----

<div align="center">

**Built with 💣 by the SolBomb Team**

*Polybees Network · Malaysia*

```
💣 SOLBOMB — LAUNCH. PUMP. GRADUATE. 💣
```

[![Made with Rust](https://img.shields.io/badge/Made%20with-Rust-orange?style=flat-square&logo=rust)](https://www.rust-lang.org)
[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=flat-square&logo=solana)](https://solana.com)
[![Anchor Framework](https://img.shields.io/badge/Anchor-Framework-00D4FF?style=flat-square)](https://anchor-lang.com)

</div>
