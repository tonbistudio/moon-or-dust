# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tribes is a turn-based 4X strategy game (Civilization-style) with Solana NFT community themes. Players lead one of six tribes to victory. Web-first PWA, mobile-optimized.

**Game Length:** 50-100 turns (full game), 20 turns (demo mode)

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Rendering:** Pixi.js v8
- **Build:** Vite
- **Package Manager:** pnpm with workspaces
- **State:** Pure functions with immutable state (for determinism)
- **Testing:** Vitest for unit/integration, Playwright for E2E
- **Wallet:** @solana/wallet-adapter
- **Storage:** IndexedDB (idb library), localStorage for preferences
- **Deployment:** Vercel (frontend)

## Monorepo Structure

```
packages/
  game-core/       # Pure game logic, no rendering dependencies
    src/
      types/       # All interfaces and type definitions
      hex/         # Hex grid math, coordinates, pathfinding
      state/       # Game state management, turn flow
      units/       # Unit definitions, movement, combat, promotions, rarity
      settlements/ # Settlement logic, yields, buildings, adjacency, milestones
      tribes/      # Tribe definitions, bonuses, unique content
      tech/        # Tech tree, research
      cultures/    # Cultures tree, policy cards
      diplomacy/   # Diplomatic states, reputation, alliances
      trade/       # Trade routes, yields calculation
      greatpeople/ # Great person accumulation, actions
      barbarians/  # Camp spawning, barbarian AI
      goldenage/   # Triggers, effects, tracking
      wonders/     # Wonder definitions, construction, effects
      lootbox/     # Lootbox placement, rewards, claiming
      scoring/     # Floor Price calculation
      ai/          # AI decision-making (expansion, military, diplomacy)
  renderer/        # Pixi.js rendering layer
    src/
      scenes/      # Game scene, menu scene
      sprites/     # Sprite management, atlases, rarity borders
      hex/         # Hex tile rendering, fog of war, lootbox icons
      ui/          # In-game HUD components
  app/             # Vite PWA entry point
    src/
      context/     # GameContext for state management
      hooks/       # useGame, useCurrentPlayer, useSelectedSettlement
      components/  # React components for menus/UI chrome
        production/  # ProductionPanel, ProductionQueue, ItemCard, AvailableItems
      wallet/      # Solana wallet integration (not yet implemented)
      storage/     # IndexedDB save/load (not yet implemented)
```

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start dev server
pnpm dev:game-core    # Watch game-core only

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:core        # game-core tests only
pnpm test:e2e         # Playwright E2E tests

# Build
pnpm build            # Production build
pnpm build:core       # Build game-core only

# Type checking
pnpm typecheck        # Check all packages

# Linting
pnpm lint             # ESLint all packages
pnpm lint:fix         # Fix auto-fixable issues
```

## Architecture Principles

### Deterministic Game State

All game logic lives in `game-core` with zero side effects. Given the same seed and inputs, the game produces identical outputs. This enables:
- Replay verification
- Headless testing without rendering
- Future onchain state verification

```typescript
// Core state shape
interface GameState {
  version: string
  seed: number
  turn: number
  currentPlayer: TribeId
  players: Player[]
  map: HexMap
  units: Map<UnitId, Unit>
  settlements: Map<SettlementId, Settlement>
  fog: Map<TribeId, Set<HexCoord>>
  diplomacy: DiplomacyState
  tradeRoutes: TradeRoute[]
  barbarianCamps: BarbarianCamp[]
  greatPeopleProgress: Map<TribeId, GreatPeopleAccumulator>
  goldenAges: Map<TribeId, GoldenAgeState>
  lootboxes: Lootbox[]
  wonders: Wonder[]
  floorPrices: Map<TribeId, number>  // cached victory scores
}

// All mutations return new state
function applyAction(state: GameState, action: GameAction): GameState
```

### Hex Grid Coordinate System

Use axial coordinates (q, r) for hex math. Pointy-top hexes.

```typescript
interface HexCoord {
  q: number  // column
  r: number  // row
}

// Convert to cube coordinates for algorithms
interface CubeCoord {
  q: number
  r: number
  s: number  // s = -q - r
}
```

Key hex functions needed:
- `hexNeighbors(coord)` - 6 adjacent hexes
- `hexDistance(a, b)` - distance between hexes
- `hexLine(a, b)` - all hexes in a line
- `hexRange(center, radius)` - all hexes within radius
- `hexPathfind(start, end, cost)` - A* pathfinding with terrain costs

### Rendering Separation

The renderer subscribes to state changes and renders accordingly. It never mutates game state.

```typescript
// Renderer receives state, produces visuals
class GameRenderer {
  update(state: GameState, prevState: GameState): void
}

// Input events produce actions, not state changes
canvas.on('click', (hex) => {
  const action = interpretClick(state, hex)
  if (action) dispatch(action)
})
```

## Game Systems

### Yields
| Yield | Purpose |
|-------|---------|
| Gold | Currency, purchasing, maintenance |
| Alpha | Research progress (science) |
| Vibes | Border expansion, unlocking cultures |
| Production | Building/unit construction |
| Growth | Population increase |

### Units (Demo)
- Scout (exploration, 3 movement)
- Warrior (melee, 3 strength)
- Archer (ranged attack, 2/5 strength)
- Horseman (cavalry unit, 3 movement, 2 strength)
- Settler (founds settlements)
- Builder (3 build charges)

(Mid-game units)
- Soldier (melee, 6 strength)
- Sniper (ranged, 4/10 strength)
- Knight (cavalry, 3 movement, 4 strength)

(Late game units)
- Bot Fighter (melee, 12 strength)
- Rockeeter (ranged, 8/16 strength)
- Tank (cavalry, 5 movement, 10 strenth)

### Tribes (4 playable)
| Tribe | Primary | Secondary | Unique Unit | Unique Building |
|-------|---------|-----------|-------------|-----------------|
| Monkes | Vibes | Economy | Banana Slinger | Degen Mints Cabana |
| Geckos | Tech | Naval | Neon Geck | The Garage |
| DeGods | Military | Economy | DeadGod | Eternal Bridge |
| Cets | Vibes | Production | Stuckers | Creckhouse |

Gregs and Dragonz show as "coming soon" in tribe selection.

**Tribe-Specific Settlement Names:**
Each tribe has unique settlement names (see SETTLEMENTS.md):
- Monkes: Monkee Dao (capital), Skelley Central, Sombrero Junction, Alien City, Nom Town
- Geckos: Enigma City (capital), Targari, Martu, Barda, Alura
- DeGods: Dust City (capital), Y00t Town, Killer 3 Central, Supernova, DeHeaven
- Cets: Peblo City (capital), Buddha Town, Enlightenment, Illuminati, 313 City

### Floor Price (Victory Score)

Score-based victory at turn 20. "Floor Price" is the NFT-native name for victory points.

| Category | Points | Notes |
|----------|--------|-------|
| Settlements owned | 10 per settlement | |
| Population (total) | 1 per pop | |
| Land tiles controlled | 1 per tile | |
| Technologies researched | 5 per tech | |
| Cultures unlocked | 5 per culture | |
| Units alive | 2 per unit | |
| Enemy units killed | 3 per kill | |
| Gold in treasury | 1 per 10 gold | |
| Wonders built | 50-100 per wonder | Varies by wonder |
| Rare+ units alive | 2-10 per unit | Based on rarity tier |

**UI:** Always visible in top bar, shows rank vs opponents, updates in real-time.

---

## Expanded Game Systems

### Terrain Yield Modifiers

Terrain features add yields to base terrain:

| Feature | Yield Modifier | Notes |
|---------|----------------|-------|
| River (edge) | +1 Gold, +1 Growth | Adjacency bonus, not on tile |
| Oasis | +3 Growth | Desert only |
| Forest | +1 Production | Can be chopped for burst production |
| Jungle | +1 Growth | Slower movement |
| Marsh | -1 Production | Can be drained |

Resources add yields when improved:

| Resource | Type | Yield | Improvement |
|----------|------|-------|-------------|
| Iron | Strategic | +1 Production | Mine |
| Horses | Strategic | +1 Production, +1 Gold | Pasture |
| Gems | Luxury | +3 Gold | Mine |
| Marble | Luxury | +2 Vibes | Quarry |
| Whitelists | Luxury | +2 Growth, +1 Gold | Mint (NFT) |
| RPCs | Luxury | +3 Alpha | Server Farm (NFT) |
| Wheat | Bonus | +1 Growth | Farm |
| Cattle | Bonus | +1 Growth, +1 Production | Pasture |

### Unit Promotions

Units gain XP from combat (10 XP to level). Each level grants one promotion choice:

**Combat Path:**
- Battlecry I/II/III: +10/20/30% strength when attacking
- Defender I/II/III: +10/20/30% strength when defending

**Mobility Path:**
- Swift I/II: +1/+2 movement points
- Pathfinder: Ignore terrain movement costs

**Survival Path:**
- Regeneration: Heal +5 HP per turn even when moving
- Last Stand: +25% strength when below 50% HP
- Medic: Adjacent friendly units heal +5 HP per turn

```typescript
interface UnitPromotion {
  id: PromotionId
  name: string
  path: 'combat' | 'mobility' | 'survival'
  effect: PromotionEffect
  prerequisite?: PromotionId
}
```

### Diplomatic Relationships

Five diplomatic states between tribes:

| State | Effect | Transitions |
|-------|--------|-------------|
| War | Can attack, no shared vision | → Hostile (peace treaty) |
| Hostile | Cannot enter territory | → Neutral (5 turns no conflict) |
| Neutral | Open borders with cost | → Friendly (gifts, no conflict) |
| Friendly | Open borders free | → Allied (mutual agreement) |
| Allied | Shared capital vision, +10% yields when trading | → Friendly (betrayal) |

**Mechanics:**
- Declaring war while Friendly causes -20 diplomacy with all tribes friendly with the target
- Declaring war will automatically cause Allies of opponent to also go to war with you
- Alliance requires mutual agreement (AI considers shared enemies, trade value)
- Shared vision: Allied tribes see 2-hex radius around each other's capitals

```typescript
interface DiplomacyState {
  relations: Map<TribePairKey, DiplomaticRelation>
  warWeariness: Map<TribeId, number>
  reputationModifiers: Map<TribeId, ReputationEvent[]>
}

type DiplomaticStance = 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied'
```

### Policy Cards (Slotted System)

Cultures unlock policy cards through A/B choices. Cards are slotted by type and can be swapped when completing cultures.

**Slot Types:**
| Slot | Color | Focus |
|------|-------|-------|
| Military [M] | Red | Combat, units, defense |
| Economy [E] | Yellow | Gold, production, growth |
| Progress [P] | Blue | Research, expansion, development |
| Wildcard [W] | Purple | Any card type |

**Starting Slots:** 1 Military, 1 Economy, 0 Progress, 0 Wildcard

**Slot Progression (from cultures):**
| Culture | Unlocks |
|---------|---------|
| Code of Laws | +1 Military slot |
| Foreign Trade | +1 Progress slot |
| Early Empire | +1 Economy slot |
| Political Philosophy | +1 Wildcard slot |
| Recorded History | +1 Wildcard slot |

**A/B Choice System:**
- Each culture presents two policy cards (A or B)
- Player chooses one to add to their pool permanently
- The other choice is lost forever
- Cards in pool can be slotted/unslotted freely when completing any culture

**Example Policy Choices:**
| Culture | Option A (Type) | Option B (Type) |
|---------|-----------------|-----------------|
| Code of Laws | Tradition [E]: +2 Vibes in capital | Discipline [M]: +5 unit healing |
| Military Tradition | Agoge [M]: +50% unit XP | Strategos [M]: +1 Great General points |
| Foreign Trade | Caravansary [E]: +2 Gold per trade route | Maritime [P]: +1 Trade route capacity |
| Diamond Hands | Hodl [M]: Units +25% defense below 50% HP | Paper Hands [P]: -50% war weariness |

**Swapping Rules:**
- Can only swap cards when completing a culture
- Cards must match slot type (or use Wildcard)
- Unslotted cards remain in pool for later use

```typescript
type PolicySlotType = 'military' | 'economy' | 'progress' | 'wildcard'

interface PolicyCard {
  id: PolicyId
  name: string
  cultureId: CultureId
  slotType: PolicySlotType
  choice: 'a' | 'b'
  effect: PolicyEffect
}

interface PlayerPolicies {
  slots: {
    military: number
    economy: number
    progress: number
    wildcard: number
  }
  pool: PolicyId[]        // all unlocked cards
  active: PolicyId[]      // currently slotted cards
}
```

### Cross-Prerequisites (Tech ↔ Culture)

Some technologies require culture knowledge, and some cultures require technological advancement:

**Techs requiring Cultures:**
| Tech | Required Culture | Rationale |
|------|------------------|-----------|
| Currency | OTC Trading | Need trade networks first |
| Matrica | Early Empire | Large-scale projects need organization |
| Liquidity Pools | Alpha DAOs | Must have governance structures |

**Cultures requiring Techs:**
| Culture | Required Tech | Rationale |
|---------|---------------|-----------|
| Presales | Matrica | Need identity verification |
| Trenching | Discord | Need community platforms |
| Multichain | Tokenomics | Need token infrastructure |

### Resource Requirements

Strategic resources gate access to powerful units and buildings:

| Resource | Required For |
|----------|--------------|
| Iron | Swordsman, Walls level 2 |
| Horses | Horseman, Stable |

**Mechanics:**
- Resources revealed by specific techs (Iron Working reveals Iron)
- Must have improved resource in territory to build requiring units
- Losing resource doesn't disband units, but can't build more

### Settlement Adjacency Bonuses

Buildings provide bonuses based on neighboring tiles and buildings:

| Building | Adjacency Bonus |
|----------|-----------------|
| Library | +1 Alpha per adjacent Mountain |
| Marketplace | +1 Gold per adjacent Luxury resource |
| Barracks | +1 XP per adjacent Encampment district |
| Monument | +1 Vibes per adjacent Wonder |
| Granary | +1 Growth per adjacent Farm |
| Walls | +2 Defense per adjacent Hills |

**Unique Building Adjacencies:**
| Tribe | Building | Adjacency |
|-------|----------|-----------|
| Monkes | Degen Mints Cabana | +2 Gold per adjacent Jungle |
| Geckos | The Garage | +2 Alpha per adjacent Coast |
| DeGods | Eternal Bridge | +1 Gold per adjacent military building |
| Cets | Creckhouse | +1 Vibes per adjacent building (any) |

### Unit Stacking

Hex stacking limits create tactical decisions:

| Stack Limit | Rule |
|-------------|------|
| 2 Military | Max 2 combat units per hex |
| 1 Civilian | Max 1 non-combat unit (Settler, Builder, Great Person) |
| Combined | 2 military + 1 civilian max |

**Stacking Bonuses:**
- 2 units in hex: +10% defense for both
- Adjacent friendly units: +5% combat strength per adjacent ally (max +15%)

### Golden Ages

Triggered by achievements, providing temporary yield boosts.

**Universal Triggers (all tribes):**
| Achievement | Duration |
|-------------|----------|
| Research 3 techs in 5 turns | 3 turns |
| Capture an enemy capital | 4 turns |
| Found 4th settlement | 3 turns |
| Reach 20 total population | 3 turns |

**Tribe-Specific Triggers:**
| Tribe | Trigger | Duration |
|-------|---------|----------|
| Monkes | Accumulate 500 gold treasury | 4 turns |
| Geckos | Research Era 3 tech first | 5 turns |
| DeGods | Kill 10 enemy units | 4 turns |
| Cets | Control 30 tiles | 4 turns |

**Golden Age Effects:** +25% all yields, +1 movement for all units

```typescript
interface GoldenAgeState {
  active: boolean
  turnsRemaining: number
  triggersUsed: GoldenAgeTrigger[]  // can't repeat same trigger
}
```

### Trade Routes

Abstract trade connections between settlements for gold income.

**Mechanics:**
- Each settlement can send 1 outgoing trade route
- Routes are instant (no travel time) - just assign origin and destination
- Can trade with own settlements or other tribes (if Neutral or better)

**Yields:**
| Route Type | Base Gold | Bonuses |
|------------|-----------|---------|
| Internal (own settlements) | +3 | +1 per unique building at destination |
| External (other tribe) | +4 | +1 per unique luxury resource at destination, +2 if Allied |

**Pillaging (optional):** Military units can pillage enemy trade routes, breaking them and gaining gold equal to 3 turns of route value.

```typescript
interface TradeRoute {
  id: TradeRouteId
  origin: SettlementId
  destination: SettlementId
  targetTribe: TribeId  // same as owner for internal
  goldPerTurn: number
  active: boolean
}
```

### Great People

Unique powerful units spawned from accumulated yields. Only one of each can be earned per game. There is a 50% base chance of earning the great person when a threshold is hit. This percentage can be increased by buildings, policies, and other factors.

**Types and Thresholds:**
| Great Person | Accumulated From | Threshold |
|--------------|------------------|-----------|
| Fxnction | Combat XP across all units | 100 XP |
| Mert | Alpha (science) | 150 Alpha |
| Big Brain | Gold income | 200 Gold |
| SCUM | Vibes | 150 Vibes |
| HGE | Economy | 3+ trade routes |
| Solport Tom | Production | Build 2+ wonders |

**One-Time Actions (consumed on use):**
| Great Person | Action | Effect |
|--------------|--------|--------|
| Fxnction | Inspire | All units in 2-hex radius gain a free promotion |
| Mert | Eureka | Instantly complete current research |
| Big Brain | Sweep | Gain 100 gold |
| SCUM | Masterwork | Instantly expand borders by 3 tiles + 50 vibes |
| HGE | Sweep | 1 free trade route |
| Solport Tom | Beep Beep | +25% production for 3 turns |

```typescript
interface GreatPerson {
  id: UnitId
  type: GreatPersonType
  hasActed: boolean  // one-time action used
}

interface GreatPeopleAccumulator {
  combat: number
  alpha: number
  gold: number
  vibes: number
}
```

### Barbarian Camps

Neutral hostile spawners in unexplored territory.

**Spawn Rules:**
- 3-5 camps placed on map generation, always in fog
- Must be 4+ hexes from any starting position
- Spawn 1 barbarian unit every 3 turns (Warrior or Scout)

**Barbarian Behavior:**
- Roam within 5 hexes of camp
- Attack any non-barbarian unit in range
- Pillage improvements, cannot capture settlements
- Do not scale with game progress (always basic units)

**Clearing Rewards:**
- 25 gold on camp destruction
- 50% chance: reveal nearest unrevealed luxury resource
- Camp does not respawn

```typescript
interface BarbarianCamp {
  id: CampId
  position: HexCoord
  spawnCooldown: number  // turns until next spawn
  unitsSpawned: UnitId[]
  destroyed: boolean
}
```

### Lootboxes (Exploration Rewards)

Mystery tiles scattered across the map that reward exploration.

**Rewards:**
| Reward | Effect |
|--------|--------|
| Airdrop | Instant gold bonus (25-50 gold) |
| Alpha Leak | Free random technology |
| OG Holder | Free military unit spawns at nearest settlement |
| Community Growth | +3 population to capital |
| Scout | Reveals large area of map (5-hex radius) |

**Placement Rules:**
- 4-6 Lootboxes per map
- Never spawn within 2 tiles of a starting position
- Tend to spawn in corners, edges, or hard-to-reach areas
- Claimed when any unit steps on the tile

```typescript
interface Lootbox {
  id: LootboxId
  position: HexCoord
  claimed: boolean
  reward?: LootboxReward  // determined on claim, not placement
}

type LootboxReward = 'airdrop' | 'alpha_leak' | 'og_holder' | 'community_growth' | 'scout'
```

### Unit Minting (Rarity System)

When training military units, they roll a rarity that affects stats. Mirrors the NFT minting experience.

**Rarity Tiers:**
| Rarity | Chance | Stat Bonus | Floor Price Bonus |
|--------|--------|------------|-------------------|
| Common | 50% | Base stats | +0 |
| Uncommon | 30% | +1 combat strength | +0 |
| Rare | 15% | +1 combat, +1 movement | +2 |
| Epic | 4% | +2 combat, +1 movement | +5 |
| Legendary | 1% | +3 combat, +1 movement, +1 vision | +10 |

**Applies to:** All military units (Scout, Warrior, Ranged, unique units)
**Does not apply to:** Settlers, Builders, Great People

**Visual:** Colored border around unit sprite (none/green/blue/purple/gold+glow)

```typescript
type UnitRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

interface Unit {
  // ... existing fields
  rarity: UnitRarity
  rarityBonuses: {
    combat: number
    movement: number
    vision: number
  }
}
```

### Wonders

10 exclusive buildings - first to complete owns it forever. Each references a Solana project.

| Wonder | Reference | Category | Effect | Floor Price |
|--------|-----------|----------|--------|-------------|
| Candy Machine | Metaplex | Tech | +25% research speed | 50 |
| The Portal | Portal NFTs | Tech | Reveals entire map on completion | 75 |
| Magic Eden | Magic Eden | Economy | +3 Gold/turn from all trade routes | 50 |
| Boogle Graveyard | Boogles | Economy | +10 Gold per enemy unit killed | 50 |
| Degen Ape Emporium | Degen Apes | Vibes | +5 Vibes/turn | 50 |
| Alpha Art Gallery | Alpha Art | Vibes | +2 Floor Price per tech owned | 75 |
| SolBear Lair | SolBears | Military | +1 combat strength for all units | 75 |
| Turtles Hideout | Turtles | Military | All units heal +5 HP/turn | 50 |
| Taiyo Robotics Factory | Taiyo Robotics | Production | +25% production speed | 50 |
| Mindfolk Lumberyard | Mindfolk | Production | +2 Production from forest tiles | 50 |

**Mechanics:**
- Only one player can build each wonder
- If another player completes first, your production is refunded as gold
- Wonders require significant production investment
- Creates race conditions and strategic decisions

```typescript
interface Wonder {
  id: WonderId
  name: string
  category: 'tech' | 'economy' | 'vibes' | 'military' | 'production'
  effect: WonderEffect
  floorPriceBonus: number
  productionCost: number
  builtBy?: TribeId  // undefined if not yet built
  location?: SettlementId
}
```

### Population Milestones

When settlements level up, player chooses between two rewards.

**How Population Grows:**
- Building improvements adds population
- Harvesting resources adds population
- Some buildings provide passive growth
- Lootbox rewards can add population

**Milestone Choices:**
| Level | Option A | Option B |
|-------|----------|----------|
| 2 | Workshop (+1 Gold/turn) | Scout (free scout unit) |
| 3 | Bonus Gold (+10 Gold) | Border Expansion (+1 tile radius) |
| 4 | Population Boom (+3 pop) | Vibes Push (+5 Vibes) |
| 5+ | Unique Unit (tribe's special) | Monument (+20 Floor Price) |

**UI:** Clear progress bar beneath each settlement showing current/required pop for next level.

```typescript
interface Settlement {
  // ... existing fields
  level: number
  populationProgress: number
  populationThreshold: number  // increases per level
  milestonesChosen: MilestoneChoice[]
}

interface MilestoneChoice {
  level: number
  choice: 'a' | 'b'
}
```

---

## Implementation Phases

### Phase 1: Foundation
1. ✅ Project scaffold (pnpm workspaces, Vite, TypeScript configs)
2. ✅ Core type definitions (all interfaces in game-core/types)
3. ✅ Hex grid system (coordinates, neighbors, distance, pathfinding)
4. ✅ Game state structure and action system
5. ✅ Basic test infrastructure

### Phase 2: Map & Rendering
6. ✅ Terrain types with yield modifiers (rivers, forests, resources)
7. ✅ Resource placement (strategic, luxury, bonus)
8. ✅ Lootbox placement (4-6 per map, edge/corner biased)
9. ✅ Pixi.js setup and hex tile rendering
10. ✅ Camera controls (pan, zoom)
11. ✅ Fog of war system
12. ✅ Tile selection and hover states
13. ✅ Lootbox tile rendering (mystery box icon)

### Phase 3: Core Gameplay
14. ✅ Turn system and player switching
15. ✅ Unit spawning with rarity rolls
16. ✅ Unit rarity visual rendering (colored borders)
17. ✅ Unit selection and movement with stacking limits
18. ✅ Lootbox claiming and reward distribution
19. ✅ Settlement founding and rendering
20. ✅ Basic yield calculation with terrain modifiers
21. ✅ Floor Price calculation and display

### Phase 4: Economy & Growth
22. ✅ Population growth system with progress bar
23. ✅ Settlement milestone system (level-up choices)
24. ✅ Building construction with adjacency bonuses
25. ✅ Tile improvements (farms, mines, pastures, NFT improvements)
26. ✅ Gold income and maintenance
27. ✅ Production queue
28. ✅ Trade route system (internal and external)

### Phase 5: Combat & Military
29. ✅ Combat resolution system with stacking bonuses
30. ✅ Rarity bonuses applied to combat
31. ✅ Unit health and death
32. ✅ Zone of control
33. ✅ XP gain and promotion system (3 paths)
34. ✅ Barbarian camp spawning and AI
35. ✅ Barbarian clearing rewards

### Phase 6: Tech & Cultures
36. ✅ Tech tree data and UI
37. ✅ Research queue and progress
38. ✅ Tech unlocks (units, buildings, resource visibility)
39. ✅ Resource requirements for units/buildings
40. ✅ Cultures tree with policy card choices
41. ✅ Border expansion (from Vibes)

#### Phase 6b: Tech Tree Update
- ✅ Updated tech tree with crypto/Solana-themed names (30 techs across 3 eras)
- ✅ Prerequisites and cross-tree dependencies (tech ↔ culture)
- Era 1: Mining, Animal Husbandry, Farming, Coding, Smart Contracts, Archery, Minting, Bronze Working, PFPs, Horseback Riding
- Era 2: Iron Working, Discord, Currency, Staking, Lending, Matrica, Botting, On-chain Gaming, Priority Fees, Defi
- Era 3: Artificial Intelligence, Ponzinomics, Hacking, Tokenomics, Hardware Wallets, Siege Weapons, Wolf Game, Liquidity Pools, Firedancer, OHM
- Note: Some tech unlocks (new unit types, bonuses) are documented but types not yet extended

#### Phase 6c: Cultures Tree Update
- ✅ Renamed Civics → Cultures system-wide
- ✅ Renamed Culture yield → Vibes yield
- ✅ Updated policy slot types: Military [M], Economy [E], Progress [P], Wildcard [W]
- ✅ 29 NFT/crypto-themed cultures across 3 eras (see CULTURES.md)
- ✅ Cross-tree prerequisites (culture ↔ tech)
- ✅ 12 slot unlock progression points
- ✅ Full policy card definitions with concrete effects

### Phase 7: Wonders & Game Integration
42. ✅ Wonder data definitions (10 wonders)
43. ✅ Wonder construction (exclusive race mechanic)
44. ✅ Wonder effects implementation
45. ✅ Wonder UI (available, in-progress, completed) - via ProductionPanel
46. AI wonder prioritization

#### Phase 7b: React Game Integration
- ✅ GameContext for React state management
- ✅ useGame, useCurrentPlayer, useSelectedSettlement hooks
- ✅ GameCanvas component (Pixi.js wrapper)
- ✅ GameUI HUD overlay (top bar with yields, floor price, end turn)
- ✅ SettlementPanel (settlement info when selected)
- ✅ ProductionPanel with tabs (Units/Buildings/Wonders)
- ✅ ProductionQueue display with progress bars
- ✅ ItemCard and AvailableItems components
- ✅ START_PRODUCTION action handler

#### Phase 7c: Core Action Handlers
- ✅ MOVE_UNIT action (pathfinding-based movement)
- ✅ FOUND_SETTLEMENT action (settler creates settlement)
- ✅ ATTACK action (combat resolution with kill tracking)
- ✅ BUILD_IMPROVEMENT action (builder creates tile improvements)
- ✅ START_RESEARCH action (set tech research target)
- ✅ START_CULTURE action (set culture unlock target)
- Remaining stubs: SELECT_POLICY, SELECT_PROMOTION, SELECT_MILESTONE, trade routes, great persons, diplomacy

### Phase 8: Diplomacy & Trade
47. ✅ Diplomatic state tracking (5 states)
48. ✅ War declaration and reputation system
49. ✅ Alliance formation and shared vision
50. AI diplomacy decisions
51. ✅ Trade route yields and external bonuses

### Phase 9: Tribes & Identity
52. Tribe bonuses and modifiers
53. Unique units implementation
54. Unique buildings with adjacency bonuses
55. Tribe-specific golden age triggers
56. Tribe AI personalities
57. Visual differentiation per tribe

### Phase 10: Advanced Systems
58. Great People accumulation and spawning
59. Great Person one-time actions
60. Golden age triggers (universal + tribe-specific)
61. Golden age effects
62. Policy era swapping

### Phase 11: AI Opponents
63. AI decision framework
64. Expansion logic
65. Military logic with barbarian handling
66. Research and culture priorities
67. Diplomacy AI (when to ally, when to war)
68. Trade route optimization
69. Wonder race decisions
70. Lootbox hunting priority

### Phase 12: UI & Polish
71. Main menu and tribe selection
72. In-game HUD (Floor Price, yields, diplomacy, golden age status)
73. Tooltips and info panels (adjacency previews, trade route info, rarity stats)
74. End game screen with Floor Price breakdown
75. Turn notifications (golden age, great person, diplomacy, wonder completion)
76. Promotion selection UI
77. Policy card selection UI
78. Trade route management UI
79. Milestone choice UI (settlement level-up)
80. Lootbox reward popup
81. Unit minting animation (rarity reveal)

### Phase 13: Integration
82. Solana wallet connection
83. Player identity from wallet
84. IndexedDB save/load
85. PWA manifest and service worker
86. Mobile touch controls

### Phase 14: Final Polish
87. Balance tuning (yields, thresholds, costs, rarity odds)
88. Performance optimization
89. Mobile responsiveness
90. Loading states and error handling
91. Deployment to Vercel

## Testing Strategy

### game-core (Unit Tests)
- Every pure function has tests
- State transitions tested with snapshots
- Hex math verified against known values
- AI decisions tested with fixed seeds
- Diplomacy state machine transitions
- Trade route yield calculations
- Golden age trigger detection
- Great People threshold tracking
- Adjacency bonus calculations
- Promotion effect stacking
- Barbarian behavior within camp radius
- Rarity roll distribution (verify odds over many runs)
- Floor Price calculation accuracy
- Lootbox reward distribution
- Wonder exclusivity (only one builder)
- Settlement milestone progression

### renderer (Integration Tests)
- Pixi.js scene setup/teardown
- Sprite creation for state changes
- Input event translation
- Rarity border rendering
- Lootbox icon visibility in fog

### app (E2E Tests)
- Full game flow: start → 20 turns → victory screen
- Save/load round-trip
- Wallet connect flow
- Mobile viewport tests
- Trade route creation flow
- Policy card selection
- Great Person action usage
- Diplomacy UI interactions
- Lootbox claim flow
- Settlement milestone choice
- Wonder race (AI completes first)
- Unit minting animation

## Code Style

- Prefer `interface` over `type` for object shapes
- Use `readonly` for state properties
- Explicit return types on all exported functions
- No `any` - use `unknown` and narrow
- Barrel exports from each package (`index.ts`)
- Co-locate tests with source files (`*.test.ts`)

## Performance Considerations

- Object pooling for frequently created hex coordinates
- Render only visible hexes (culling)
- Batch sprite updates in Pixi.js
- Memoize expensive pathfinding results
- Use `Map` and `Set` for O(1) lookups on units/settlements
