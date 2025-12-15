# Tribes: NFT Civilization Game — Brainstorm

## Overview

A simplified Civilization-style strategy game with NFT community themes. Players lead one of six tribes (based on Solana NFT communities) through a 20-turn game representing the NFT golden age (September 2021 - May 2022). The game is a civilization builder first, with NFT flavor as an accent — not a total reskin.

## Core Concept

- **Genre:** Turn-based 4X strategy (explore, expand, exploit, exterminate)
- **Inspiration:** Civilization III/IV mechanics, Polytopia simplicity
- **Theme:** NFT communities as civilizations, lightly themed
- **Timeline:** Sept 2021 - May 2022 (the NFT golden age)
- **Platform:** Web-first (PWA), mobile-optimized
- **Target Audience:** Crypto Twitter, NFT communities, strategy game fans

---

## The Six Tribes

| Tribe | Theme | Primary Strength | Secondary Strength | Unique Unit | Unique Building |
|-------|-------|------------------|-------------------|-------------|-----------------|
| **Monkes** | Jungle empire | Civics | Economy | Banana Slinger | Degen Mints Cabana |
| **Geckos** | Desert tech | Technology | Naval | Neon | The Garage |
| **DeGods** | Divine power | Military | Economy | DeadGod | Eternal Bridge |
| **Cets** | Urban cats | Culture | Production | Stuckers | Creckhouse |
| **Gregs** | Crayon fun | Production | Military | Super Greg | Holder Chat |
| **Dragonz** | Dark temple | Economy | Technology | Cosmic Drake | Dragonz Den |

### Tribe Playstyles

- **Monkes:** Diplomatic expansion, strong economy, buy your way to victory
- **Geckos:** Tech rush, coastal/naval dominance, fast research
- **DeGods:** Aggressive military expansion, war pays for itself
- **Cets:** Tall empire, cultural pressure, strong production
- **Gregs:** Swarm tactics, outproduce everyone, cheap units
- **Dragonz:** Economic powerhouse, gold-fueled research

### Visual Direction per Tribe

| Tribe | Color Palette | Architecture Style |
|-------|---------------|-------------------|
| **Monkes** | Jungle greens, golden yellow, brown | Treehouses, vine-wrapped towers |
| **Geckos** | Neon cyan, green, purple, sand | Sleek domes, solar panels, garages |
| **DeGods** | Black, gold, grey, blood red | Temples, bridges, monoliths |
| **Cets** | Urban gray, orange, black, teal | Brick buildings, graffiti, rooftops |
| **Gregs** | Crayon yellow, red, green, primary colors | Scribbled aesthetic, marker lines |
| **Dragonz** | Deep purple, ember orange, black | Dark temples, dragon statues |

---

## Game Yields

| Yield | Name | Purpose |
|-------|------|---------|
| Gold | Gold | Currency, purchasing, maintenance |
| Science | **Alpha** | Research progress (NFT-themed rename) |
| Culture | Culture | Border expansion, civics progress |
| Production | Production | Building and unit construction |
| Growth | Growth | Population increase |

---

## Resources

Mostly classic Civ resources with 2-3 NFT-themed additions:

### Strategic Resources
- Iron — required for advanced military units
- Horses — cavalry units, movement bonuses

### Luxury Resources
- Marble — +culture
- Gold (terrain) — +gold
- Gems — +gold
- **Whitelists** — +growth or +gold (NFT-themed)
- **RPCs** — +science (NFT-themed)

### Bonus Resources
- Wheat — +growth
- Cattle — +growth/production

---

## Tech Tree (Alpha Tree)

Simple branching structure, ~12-15 nodes across 3 eras. Mostly classic Civ techs with 2-3 NFT-themed entries.

### Era 1: Foundation
- Agriculture — farms, +growth
- Mining — mines, +production
- Pottery — granary building
- Animal Husbandry — horses, pastures
- **Minting** — cultural buildings (NFT-themed)

### Era 2: Development
- Bronze Working — warrior upgrades
- Writing — libraries, +alpha
- Sailing — water movement (deferred for demo)
- **Smart Contracts** — advanced economy buildings (NFT-themed)
- Mathematics — ranged units

### Era 3: Advancement
- Iron Working — iron resource, strong military
- Currency — markets, trade
- Engineering — roads, siege units
- **On-Chain Governance** — unlocks late civics (NFT-themed)

---

## Civics Tree (Governance Tree)

Separate from tech, unlocks policies, some buildings, and units. ~10-12 nodes with 2-3 NFT-themed entries.

### Era 1: Traditions
- Code of Laws — basic governance
- Craftsmanship — +production bonus
- **GM Culture** — +loyalty/happiness (NFT-themed)

### Era 2: Organization
- Military Tradition — unit experience bonus
- State Workforce — +production for wonders
- Early Empire — +settler production
- **Diamond Hands** — units fight to death, no retreat (NFT-themed)

### Era 3: Systems
- Recorded History — +culture, +alpha
- **DAO Governance** — additional policy slots (NFT-themed)
- Mercantilism — +gold from trade

---

## Units

### Standard Units (All Tribes)
| Unit | Role | Combat Strength | Movement | Notes |
|------|------|-----------------|----------|-------|
| Scout | Exploration | 1 | 3 | Ignores terrain cost |
| Warrior | Basic melee | 3 | 2 | Starting military unit |
| Ranged | Ranged attack | 2 (5 ranged) | 2 | Can attack without retaliation |
| Settler | Found settlements | 0 | 2 | Consumes population |
| Builder | Improve tiles | 0 | 2 | 3 build charges |

### Unique Units (Replace Standard Units)
| Tribe | Unique Unit | Replaces | Special Ability |
|-------|-------------|----------|-----------------|
| Monkes | Banana Slinger | Ranged | Ignores terrain penalties |
| Geckos | Neon Geck | Scout | Amphibious, bonus near water |
| DeGods | DeadGod | Warrior | Heals when it kills |
| Cets | Stuckers | Ranged | Debuffs enemy settlements |
| Gregs | Super Greg | Warrior | Bonus when adjacent to other units |
| Dragonz | Cosmic Drake | Ranged | Flying, ignores terrain |

---

## Buildings

### Standard Buildings
| Building | Effect | Requires |
|----------|--------|----------|
| Monument | +1 culture | — |
| Granary | +2 growth | Pottery |
| Library | +2 alpha | Writing |
| Barracks | +XP for units | Bronze Working |
| Market | +3 gold | Currency |
| Walls | +5 defense | — |

### Unique Buildings
| Tribe | Building | Effect |
|-------|----------|--------|
| Monkes | Degen Mints Cabana | +gold, +happiness, burst economy action |
| Geckos | The Garage | +alpha, can build naval units inland |
| DeGods | Eternal Bridge | +gold from military buildings, faster healing |
| Cets | Creckhouse | +culture, +production, border pressure |
| Gregs | Holder Chat | +production, adjacent unit combat bonus |
| Dragonz | Dragonz Den | +gold, +alpha, purchase tech with gold |

---

## Victory Condition (Demo)

**Score-based victory at end of turn 20.**

| Category | Points |
|----------|--------|
| Settlements owned | 10 per settlement |
| Population (total) | 1 per pop |
| Land tiles controlled | 1 per tile |
| Technologies researched | 5 per tech |
| Civics unlocked | 5 per civic |
| Units alive | 2 per unit |
| Enemy units killed | 3 per kill |
| Gold in treasury | 1 per 10 gold |

### Future Victory Types (Post-Demo)
| Victory Type | Condition | Favored Tribes |
|--------------|-----------|----------------|
| Domination | Control all capitals | DeGods, Gregs |
| Technology | Research final tech | Geckos, Dragonz |
| Cultural | Accumulate X culture | Cets, Monkes |
| Economic | Accumulate X gold | Monkes, Dragonz |

---

## Map & Terrain

### Demo Map
- Fixed 15x15 hex grid
- Pre-designed for balanced starts
- Procedural generation deferred to post-demo

### Terrain Types
| Terrain | Movement Cost | Defense Bonus | Yields |
|---------|---------------|---------------|--------|
| Grassland | 1 | 0% | +2 growth |
| Plains | 1 | 0% | +1 growth, +1 production |
| Forest | 2 | +25% | +1 production |
| Hills | 2 | +25% | +2 production |
| Mountains | Impassable | — | — |
| Water | Impassable (demo) | — | — |
| Desert | 1 | 0% | — |

### Fog of War
- Tiles start unexplored (black)
- Revealed tiles show terrain but not units (gray)
- Visible tiles near your units/settlements show everything

---

## AI Opponents

### Demo Implementation
- 1-3 AI opponents (player chooses)
- Random tribe selection from playable tribes
- Mirror matches allowed
- Simple decision-making: expand > build military > attack if stronger

### AI Priorities by Tribe
- Monkes AI: prioritizes economy and expansion
- Geckos AI: prioritizes research
- DeGods AI: prioritizes military and aggression
- Cets AI: prioritizes culture and tall growth

---

## Onchain Infrastructure (Future)

Design for these features from day one, implement later:

### Wallet Integration
- Wallet address as player identity (profile key)
- No token-gating in demo
- Future: NFT unlocks for tribes, cosmetics

### Save System
- Local saves to IndexedDB
- Tied to wallet address
- Export/import JSON as backup
- Future: cloud sync

### Achievement System
- Track achievements locally
- Store with proof hash (game state when achieved)
- Future: mint as compressed NFTs

### Deterministic Game State
```typescript
interface GameState {
  version: string
  seed: number // enables replay verification
  turn: number
  tribes: Tribe[]
  map: Tile[][]
  units: Unit[]
  settlements: Settlement[]
}
```

All game state must be serializable and deterministic (same inputs = same outputs) to enable future onchain verification.

---

## Tech Stack

### Frontend
- TypeScript
- Canvas API or Pixi.js for rendering
- PWA for mobile install

### Wallet
- Solana wallet-adapter
- Phantom, Solflare, etc.

### Storage
- IndexedDB for saves
- localStorage for preferences

### Future Backend (Not for Demo)
- Cloud save sync
- Leaderboards
- Achievement minting

---

## Demo Scope Summary

### Included
- 4 playable tribes: Monkes, Geckos, DeGods, Cets
- 2 locked tribes: Gregs, Dragonz (visible, "coming soon")
- 20-turn game, score-based victory
- Fixed 15x15 map with fog of war
- ~12 techs, ~10 civics (2-3 NFT-themed each)
- 5 standard unit types + 4 unique units
- Standard buildings + 4 unique buildings
- 1-3 AI opponents
- Wallet connect for identity
- Local save/load

### Deferred
- Procedural maps
- Full tech/civics trees
- Naval units and water gameplay
- Gregs and Dragonz tribes
- Multiplayer
- Onchain achievements/NFTs
- Cloud saves
- Sound/music

---

## Visual Target

**Aim for:** Polytopia level of polish with distinct tribal aesthetics

- Clean 2D hex grid
- Stylized, not realistic
- Strong color differentiation per tribe
- Readable at mobile screen sizes
- Screenshot-worthy for CT sharing

**Art approach for demo:**
- Start with programmer art (colored shapes)
- Design asset pipeline for hot-swapping
- Upgrade visuals after gameplay is validated

---

## Timeline Flavor

The Sept 2021 - May 2022 framing appears in:
- Turn counter (optional: show months instead of turn numbers)
- Loading screen flavor text
- End game screen messaging
- Occasional tooltip flavor text
- Tribe descriptions and lore

The theme is atmosphere, not required knowledge to play.

---

## Open Questions

1. **Settlement naming:** Player-named or auto-generated per tribe? Auto-generated based on set list (based on theme)
2. **Difficulty levels:** Include in demo or defer? Defer
3. **Tutorial:** Interactive or just tooltips? Just tooltips
4. **Random events:** Include any in demo? Possibly
5. **Sound:** Defer entirely or add basic SFX? Defer, sound isn't important

---

## Next Steps

1. Write CLAUDE.md (project spec for Claude Code)
2. Set up project scaffold
3. Implement hex grid and map rendering
4. Build game state and turn system
5. Add units and movement
6. Add settlements and economy
7. Add combat
8. Add tech and civics trees
9. Add tribe differentiation
10. Add wallet connect and saves
11. Polish and playtest
