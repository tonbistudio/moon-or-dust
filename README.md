# Moon or Dust

A turn-based 4X strategy game set during the golden age of Solana NFTs. Lead one of four tribes — Monkes, Geckos, DeGods, or Cets — through 50 turns of exploration, warfare, diplomacy, and culture. Found settlements, research technology, train armies, and build wonders. At the end, only one tribe's floor price survives.

Built for the [MagicBlock](https://www.magicblock.gg/) hackathon.

## Play It

```bash
pnpm install
pnpm build:core
pnpm dev
```

Then open [localhost:3000](http://localhost:3000), connect your Solana wallet, and pick a tribe.

## How MagicBlock Powers the Game

Moon or Dust uses two MagicBlock protocols to bring on-chain verification and competitive infrastructure to a full strategy game.

### Verifiable Randomness (ephemeral-vrf-sdk)

Every military unit you train goes through a "minting" experience — you roll a rarity (Common through Legendary) that permanently affects its stats. When your wallet is connected, that roll happens on-chain through MagicBlock's VRF oracle:

1. The game sends a `roll_rarity` transaction to our Anchor program on devnet
2. The program CPIs into MagicBlock's VRF oracle and creates a PDA to hold the result
3. The oracle calls back with a verified random byte
4. The byte maps to a rarity tier: Common (50%), Uncommon (30%), Rare (15%), Epic (4%), Legendary (1%)
5. The UI polls the PDA and reveals the rarity with an animation

This means no one — not the player, not the server — can predict or manipulate what rarity they'll get. The proof lives on-chain.

**Anchor program:** [`8U41n8DFkJUiyrxzCLpNQyvAAbHfnoD2GvRpCxQxiMaQ`](https://explorer.solana.com/address/8U41n8DFkJUiyrxzCLpNQyvAAbHfnoD2GvRpCxQxiMaQ?cluster=devnet) (devnet)

Without a wallet connected, the game falls back to local randomness so you can still play.

**Key files:**
- `programs/vrf-rarity/src/lib.rs` — Anchor program (roll_rarity + callback)
- `packages/app/src/magicblock/vrf.ts` — TypeScript client (OnChainVRFService / LocalVRFService)
- `packages/app/src/components/MintPopup.tsx` — Minting UI with VRF status indicator

### SOAR Leaderboards & Achievements (soar-sdk)

At the end of each game, your floor price score gets submitted to a global on-chain leaderboard through MagicBlock's SOAR protocol. The main menu has a leaderboard panel that fetches and displays rankings from the chain.

The game also tracks five achievements (First Wonder, 10 Kills, Golden Age, Tech Leader, Empire Builder) that fire based on in-game state transitions. These are checked every turn and logged when earned.

**Key files:**
- `packages/app/src/magicblock/soar.ts` — SOAR service (score submission, leaderboard fetch, achievements)
- `packages/app/src/magicblock/achievements.ts` — Achievement condition checkers
- `packages/app/src/components/LeaderboardPanel.tsx` — Leaderboard UI
- `packages/app/src/components/EndGameScreen.tsx` — Score submission on game end

### Wallet Integration

Solana wallet connection via `@solana/wallet-adapter` (Phantom, Solflare, Backpack, etc.). Connecting your wallet enables on-chain VRF minting and SOAR score submission. The game is fully playable without a wallet — all on-chain features have local fallbacks.

## What is This?

Moon or Dust is a Civilization-style strategy game that replaces historical civilizations with Solana NFT communities. The "floor price" is your victory score — it goes up as you expand territory, research tech, build wonders, and crush your enemies.

The game runs entirely in the browser. All game logic is deterministic and lives in a pure TypeScript engine with no side effects — the same inputs always produce the same outputs. This design is intentional: it's the foundation for future on-chain state verification through MagicBlock's BOLT framework.

### The Tribes

| Tribe | Playstyle | Unique Unit | Unique Building |
|-------|-----------|-------------|-----------------|
| **Monkes** | Economy + Vibes | Banana Slinger (3-range archer) | Degen Mints Cabana |
| **Geckos** | Tech + Military | Neon Geck (kills grant Alpha) | The Garage |
| **DeGods** | Military + Economy | DeadGod (kills grant Gold) | Eternal Bridge |
| **Cets** | Vibes + Production | Stuckers (slows enemies) | Creckhouse |

Each tribe has its own AI personality, settlement names, bonuses, and a tribe-specific great person you can only unlock with their unique building.

## Game Features

**Core 4X Gameplay**
- Hex-based map with 9 terrain types, resources, and biome clustering
- Settlement founding, population growth, building construction
- 30 technologies across 3 eras
- 29 cultures with A/B policy card choices (Civ 6-style slotting system)
- Diplomatic relations: war, hostile, neutral, friendly, allied
- Trade routes between settlements and with other tribes
- 10 unique wonders, each referencing a real Solana project

**Combat**
- Melee, ranged, cavalry, and siege unit classes
- Unit promotions across combat, mobility, and survival paths
- NFT-style rarity system — units mint as Common through Legendary (VRF-backed when wallet connected)
- Adjacency bonuses, terrain modifiers, river crossing penalties

**Advanced Systems**
- 23 great people (real Solana community figures) with powerful one-time abilities
- Golden ages triggered by achievements
- Lootboxes scattered across the map (airdrops, alpha leaks, OG holders)
- Population milestones with A/B reward choices
- Full AI opponents with expansion, military, research, and diplomacy logic

## Architecture

```
packages/
  game-core/     Pure game logic — no rendering, no side effects, 213 tests
  renderer/      Pixi.js v8 rendering layer
  app/           React frontend, wallet integration, MagicBlock clients
    src/
      magicblock/  VRF client, SOAR service, achievement tracking, config
      wallet/      Solana wallet adapter integration

programs/
  vrf-rarity/    Anchor program for on-chain VRF rarity rolls (devnet)
```

The game engine is fully separated from rendering. `game-core` exports pure functions that take state in and return state out. The renderer subscribes to state changes and never mutates anything. This makes the logic testable, replayable, and eventually portable to on-chain verification via MagicBlock's BOLT ECS framework.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game engine | TypeScript (strict), pure functions, deterministic state |
| Rendering | Pixi.js v8 |
| UI | React 18 |
| Build | Vite + pnpm workspaces |
| Testing | Vitest (213 unit/integration tests) |
| On-chain randomness | Anchor 0.32.1 + ephemeral-vrf-sdk (MagicBlock VRF) |
| Leaderboards | @magicblock-labs/soar-sdk (MagicBlock SOAR) |
| Wallet | @solana/wallet-adapter |
| Network | Solana devnet |

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run all 213 tests |
| `pnpm typecheck` | Type-check all packages |
| `anchor build` | Build the Solana program |
| `anchor deploy` | Deploy to devnet |

## License

MIT
