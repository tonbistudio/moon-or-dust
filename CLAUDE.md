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

### Units

**Civilian Units (always available):**
- Scout (exploration, 3 movement)
- Settler (founds settlements)
- Builder (3 build charges)

**Military Units by Era:**

| Era | Type | Unit | Unlocked By | Stats |
|-----|------|------|-------------|-------|
| Base | Melee | Warrior | — | 3 strength, 7 HP |
| 1 | Ranged | Archer | Archery | 2-hex range, 2 strength, 5 HP|
| 1 | Cavalry | Horseman | Horseback Riding | 3 movement, 2 strength, 5 HP|
| 2 | Melee | Swordsman | Iron Working | 6 strength (requires Iron), 15 HP |
| 2 | Ranged | Sniper | Botting | 2-hex range, 4 strength, 10 HP |
| 2 | Cavalry | Knight | Priority Fees | 3 movement, 4 strength, 8 HP |
| 2 | Siege | Social Engineer | Matrica | 2-hex range, 2 strength against combat units, 10 strength against settlement HP, 6 HP |
| 3 | Melee | Bot Fighter | Artificial Intelligence | 12 strength, 25 HP |
| 3 | Ranged | Rockeeter | Wolf Game | 2-hex range, 8 strength, 18 HP |
| 3 | Cavalry | Tank | Hacking | 4 movement, 10 strength, 20 HP |
| 3 | Siege | Bombard | Siege Weapons | 2-hex range, 4 strength against combat units, 20 strength against settlement HP, 12 HP |

### Buildings

**Buildings by Era and Yield:**

| Era | Yield | Building | Unlocked By | Effect |
|-----|-------|----------|-------------|--------|
| 1 | Population | Granary | Farming | +Population |
| 1 | Alpha | Library | Coding | +Alpha |
| 1 | Gold | Solanart | Minting | +Gold |
| 1 | Vibes | Gallery | PFPs | +Vibes |
| 1 | Combat Prod | Barracks | Bronze Working | +Combat unit production |
| 2 | Population | Server | Discord | +Population |
| 2 | Alpha | Alpha Hunter Hideout | Matrica | +Alpha |
| 2 | Gold | Yield Farm | Defi | +Gold |
| 2 | Vibes | Art Upgrader | Staking | +Vibes |
| 2 | Production | Bot Farm | Botting | +Production |
| 2 | Combat Prod | Arena | On-chain Gaming | +Combat unit production |
| 3 | Population | Hype Machine | Ponzinomics | +Population |
| 3 | Gold | Dex Labs | Tokenomics | +Gold |
| 3 | Production | Ledger Foundry | Hardware Wallets | +Production |
| 3 | Vibes | Cult HQ | OHM | +Vibes |

### Improvements

| Improvement | Unlocked By | Effect |
|-------------|-------------|--------|
| Mine | Mining | +Production, works Iron |
| Quarry | Mining | +Production, works Marble |
| Farm | Farming | +Growth |
| Pasture | Animal Husbandry | Works Horses, Cattle |
| Mint | Minting | Works Whitelists |
| Roads | Horseback Riding | +Movement speed |

### Tribes (4 playable)
| Tribe | Primary | Secondary | Unique Unit | Unique Building |
|-------|---------|-----------|-------------|-----------------|
| Monkes | Vibes | Economy | Banana Slinger (replaces Archer, 3 range, 3/6 strength) | Degen Mints Cabana |
| Geckos | Tech | Naval | Neon Geck (replaces Sniper, 3 mobility, kills grant +5 Alpha) | The Garage |
| DeGods | Military | Economy | DeadGod (replaces Swordsman, 8 strength, kills grant +20 Gold) | Eternal Bridge |
| Cets | Vibes | Production | Stuckers (replaces Swordsman, 6 strength, 3 mobility, enemies mobility=0 for 2 turns when attacked by Stuckers) | Creckhouse |

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
| Monkes | Degen Mints Cabana | +2 Gold per adjacent Jungle or Forest |
| Geckos | The Garage | +2 Alpha per adjacent Coast or Desert |
| DeGods | Eternal Bridge | +20% combat unit production |
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

**Universal Great People - Types and Thresholds:**
| Great Person | Accumulated From | Threshold |
|--------------|------------------|-----------|
| Fxnction | Combat XP | 100 XP |
| Mert | Alpha | 150 Alpha |
| Big Brain | Gold | 200 Gold |
| SCUM | Vibes | 150 Vibes |
| HGE | Trade | 3 trade routes |
| Solport Tom | Production | 2 wonders built |
| The Solstice | Kills | 5 enemy units killed |
| Toly | Alpha | 250 Alpha |
| Dingaling | Gold | 400 Gold |
| John Le | Vibes | 350 Vibes |
| Ravi | Trade | 5 trade routes |
| Renji | Production | 2 wonders + 8 buildings built |
| Iced Knife | Captures | 2 cities captured |
| Raj | Alpha | 350 Alpha |
| Retired Chad Dev | Gold | 600 Gold |
| Monoliff | Vibes | 500 Vibes |
| Watch King | Trade | 7 trade routes |
| Blocksmyth | Production | 3 wonders built |
| Jpeggler | Combat XP | 200 XP |

**One-Time Actions (consumed on use):**
| Great Person | Action | Effect |
|--------------|--------|--------|
| Fxnction | Inspire | All units in 2-hex radius gain a free promotion |
| Mert | Eureka | Instantly produce next Alpha building |
| Big Brain | Sweep | Gain 100 gold |
| SCUM | Masterwork | Instantly expand borders by 3 tiles + 50 vibes |
| HGE | Sweep | 1 free trade route |
| Solport Tom | Beep Beep | +25% production for 3 turns |
| The Solstice | Goofy Gorilla Gang | All units in 2-hex radius +10% combat strength for 5 turns |
| Toly | Dragon Mode | +10% Alpha yield for 5 turns |
| Dingaling | Forgotten Treasure | +15% gold yield for 5 turns |
| John Le | First Edition | Instantly complete current culture research |
| Ravi | Perfect Portfolio | Triggers 2-turn Golden Age |
| Renji | Golden Akari | +50% wonder production for 3 turns |
| Iced Knife | Twisted Knife | All units in 2-hex radius +25% defense for 5 turns + free promotion |
| Raj | Myro's Epiphany | Instantly complete current research |
| Retired Chad Dev | Mad Sweep | Gain 300 Gold |
| Monoliff | Grail Ape | +33% Vibes production for 4 turns |
| Watch King | Rolex Romp | Trade route gold income +25% for 5 turns |
| Blocksmyth | Mercury Blast | +30% building production for 3 turns |
| Jpeggler | Enigma Venture | All units in 3-hex radius gain a free promotion |

**Tribe-Specific Great People (building + culture required):**
| Great Person | Tribe | Requirements | Action | Effect |
|--------------|-------|--------------|--------|--------|
| Nom | Monkes | Degen Mints Cabana + Memecoin Mania | BONK! | +300 Gold and +33% Gold income for 5 turns |
| Frank | DeGods | Eternal Bridge + Fudding | Tragedy for the Haters | 3 free random combat units + 200 Vibes |
| Genuine Articles | Geckos | The Garage + Whitelisting | Immortal Journey | +20% production and +25% Alpha for 5 turns |
| Peblo | Cets | Creckhouse + Virality | We are Peblo | +50% defense and +25% Vibes for 5 turns |

```typescript
type GreatPersonId =
  // Universal (19)
  | 'fxnction' | 'mert' | 'big_brain' | 'scum' | 'hge' | 'solport_tom'
  | 'the_solstice' | 'toly' | 'dingaling' | 'john_le' | 'ravi' | 'renji'
  | 'iced_knife' | 'raj' | 'retired_chad_dev' | 'monoliff' | 'watch_king'
  | 'blocksmyth' | 'jpeggler'
  // Tribal (4)
  | 'nom' | 'frank' | 'genuine_articles' | 'peblo'

type GreatPersonCategory = 'combat' | 'alpha' | 'gold' | 'vibes' | 'trade' | 'production' | 'kills' | 'captures' | 'tribal'

interface GreatPersonDefinition {
  id: GreatPersonId
  name: string
  category: GreatPersonCategory
  threshold: GreatPersonThreshold
  action: string
  effect: GreatPersonEffect
  tribe?: TribeName  // Only for tribal great people
}

type GreatPersonThreshold =
  | { type: 'accumulator'; stat: 'combat' | 'alpha' | 'gold' | 'vibes'; amount: number }
  | { type: 'count'; stat: 'tradeRoutes' | 'wondersBuilt' | 'buildingsBuilt' | 'kills' | 'captures'; amount: number }
  | { type: 'combo'; wonders: number; buildings: number }
  | { type: 'tribal'; building: BuildingId; culture: CultureId }

interface GreatPeopleAccumulator {
  combat: number    // XP from all units
  alpha: number     // Total Alpha earned
  gold: number      // Total Gold earned
  vibes: number     // Total Vibes earned
  kills: number     // Enemy units killed
  captures: number  // Cities captured
  tradeRoutes: number      // Current active trade routes
  wondersBuilt: number     // Total wonders built
  buildingsBuilt: number   // Total buildings built
}

interface GreatPerson {
  id: UnitId
  greatPersonId: GreatPersonId
  hasActed: boolean  // one-time action used
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

10 exclusive buildings - first to complete owns it forever. Each references a Solana project. Wonders are era-gated by tech or culture prerequisites.

**Era 1 Wonders** (Cost: 80-120, Floor Price: +25)
| Wonder | Reference | Category | Prereq | Cost | Effect |
|--------|-----------|----------|--------|------|--------|
| Candy Machine | Metaplex | Tech | Tech: Smart Contracts | 120 | +10% research speed |
| Degen Ape Emporium | Degen Apes | Vibes | Culture: Diamond Hands | 120 | +3 Vibes/turn |
| Turtles Hideout | Turtles | Military | Culture: Memeing | 80 | All units heal +3 HP/turn |

**Era 2 Wonders** (Cost: 150-200, Floor Price: +50)
| Wonder | Reference | Category | Prereq | Cost | Effect |
|--------|-----------|----------|--------|------|--------|
| Magic Eden | Magic Eden | Economy | Tech: Currency | 180 | +3 Gold/turn from trade routes |
| Taiyo Robotics Factory | Taiyo Robotics | Production | Tech: Staking | 200 | +20% production speed |
| Boogle Graveyard | Boogles | Economy | Culture: Alpha DAOs | 160 | +10 Gold per enemy killed |
| Alpha Art Gallery | Alpha Art | Vibes | Culture: Fudding | 180 | +2 Floor Price per tech |

**Era 3 Wonders** (Cost: 250-350, Floor Price: +75)
| Wonder | Reference | Category | Prereq | Cost | Effect |
|--------|-----------|----------|--------|------|--------|
| Mindfolk Lumberyard | Mindfolk | Production | Tech: Ponzinomics | 280 | +3 Production from forests |
| The Portal | Portal NFTs | Economy | Culture: Hard Shilling | 300 | +50% gold in this settlement |
| Balloonsville Lair | Balloonsville | Military | Culture: Rugging | 320 | +2 combat strength all units |

**Mechanics:**
- Only one player can build each wonder
- If another player completes first, your production is refunded as gold
- Wonders require unlocking prerequisites (tech or culture) before building
- Era-scaled costs and effects reward late-game investment

```typescript
interface WonderDefinition {
  id: WonderId
  name: string
  reference: string
  category: 'tech' | 'economy' | 'vibes' | 'military' | 'production'
  era: 1 | 2 | 3
  productionCost: number
  floorPriceBonus: number
  effect: WonderEffect
  description: string
  techPrereq?: TechId    // Tech required to build
  culturePrereq?: CultureId  // Culture required to build
}

interface Wonder {
  id: WonderId
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
46. ✅ AI wonder prioritization

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
- ✅ DECLARE_WAR, PROPOSE_PEACE, PROPOSE_ALLIANCE actions (diplomacy)
- ✅ SELECT_POLICY action (choose A/B policy when completing culture)
- ✅ SWAP_POLICIES action (slot/unslot policies after culture completion)
- ✅ SELECT_PROMOTION action (choose promotion for leveled unit)
- ✅ SELECT_MILESTONE action (choose settlement level-up reward)
- ✅ CREATE_TRADE_ROUTE action (establish trade between settlements)
- ✅ CANCEL_TRADE_ROUTE action (cancel existing trade route)
- ✅ USE_GREAT_PERSON action (use great person's one-time ability)

#### Phase 7d: Wonder Prerequisites & Era Scaling
- ✅ Wonders now require tech or culture prerequisites
- ✅ Era 1 wonders: Floor Price +25, Cost 80-120, weaker effects
- ✅ Era 2 wonders: Floor Price +50, Cost 150-200, moderate effects
- ✅ Era 3 wonders: Floor Price +75, Cost 250-350, powerful effects
- ✅ Renamed SolBear Lair → Balloonsville Lair
- ✅ Changed The Portal effect: reveal map → +50% gold in settlement
- ✅ Wonder prereqs documented in TECH.md and CULTURES.md

#### Phase 7e: Basic AI
- ✅ AI turn execution (runs after human ends turn)
- ✅ AI unit movement (toward nearest enemy)
- ✅ AI combat (attacks enemies in range, prioritizes weak targets)
- ✅ Fog of war updates on unit movement

### Phase 8: Diplomacy & Trade
47. ✅ Diplomatic state tracking (5 states)
48. ✅ War declaration and reputation system
49. ✅ Alliance formation and shared vision
50. ✅ AI diplomacy decisions
51. ✅ Trade route yields and external bonuses

#### Phase 8b: Diplomacy Action Handlers & AI
- ✅ DECLARE_WAR action handler (with reputation penalties, alliance obligations)
- ✅ PROPOSE_PEACE action handler (war → hostile transition)
- ✅ PROPOSE_ALLIANCE action handler (friendly → allied)
- ✅ AI military strength calculation
- ✅ AI peace decisions (war weariness, losing wars)
- ✅ AI war decisions (military advantage, settlement targets)
- ✅ AI alliance decisions (shared enemies, strongest ally)

### Phase 9: Tribes & Identity
52. ✅ Tribe bonuses and modifiers
53. ✅ Unique units implementation
54. ✅ Unique buildings with adjacency bonuses
55. ✅ Tribe-specific golden age triggers
56. ✅ Tribe AI personalities
57. ✅ Visual differentiation per tribe

#### Phase 9a: Tribal Unique Units & Buildings
- ✅ Added 4 unique unit types to UnitType
- ✅ Banana Slinger (Monkes): replaces Archer, 3 range, 15/30 strength
- ✅ Neon Geck (Geckos): replaces Sniper, 3 mobility, kills grant +5 Alpha
- ✅ DeadGod (DeGods): replaces Swordsman, 45 strength, kills grant +20 Gold
- ✅ Stuckers (Cets): replaces Swordsman, 35 strength, 3 mobility, debuffs enemy mobility
- ✅ Unit definitions with stats, production costs, maintenance costs
- ✅ Degen Mints Cabana (Monkes): +2 Gold per adjacent Jungle/Forest, unlocked by Lending
- ✅ The Garage (Geckos): +2 Alpha per adjacent Coast/Desert, unlocked by Staking
- ✅ Eternal Bridge (DeGods): +20% combat unit production, unlocked by Matrica
- ✅ Creckhouse (Cets): +1 Vibes per adjacent building, unlocked by Discord
- ✅ Multi-terrain adjacency logic for unique buildings
- ✅ Tech unlock integration for unique buildings

#### Phase 9b: Tribe Bonuses System
- ✅ TribeBonuses interface with optional bonus fields
- ✅ Tribes module with tribe definitions and helper functions
- ✅ Monkes: +5% Vibes yield, +1 trade route capacity
- ✅ Geckos: +5% Alpha yield, +10% production on ranged units
- ✅ DeGods: +10% production on melee units, +10% gold from gold-yield buildings
- ✅ Cets: +10% Vibes from culture buildings, +10% production from production buildings
- ✅ Yield bonuses applied in state turn processing (alpha, vibes)
- ✅ Building category bonuses applied in calculateBuildingYields
- ✅ Unit production bonuses applied in processProduction
- ✅ Trade route capacity bonus applied in getMaxTradeRoutes

#### Phase 9c: Tribe AI Personalities
- ✅ TribePersonality interface with 7 behavioral modifiers
- ✅ Personality-based war declaration (aggressionMultiplier, warStrengthRatioModifier)
- ✅ Personality-based peace-seeking (peacefulnessMultiplier, peaceStrengthRatioModifier)
- ✅ Personality-based alliance formation (allianceMultiplier)
- ✅ Target prioritization by personality (weakest/strongest/closest)
- ✅ War weariness tolerance per tribe
- ✅ Monkes: Diplomatic, trade-focused (low aggression, high alliance, seeks peace early)
- ✅ Geckos: Cautious, research-focused (moderate, efficient fighters)
- ✅ DeGods: Aggressive, war-focused (high aggression, targets strongest, holds out in wars)
- ✅ Cets: Diplomatic, builder-focused (very low aggression, defensive, prioritizes nearby threats)

#### Phase 9d: Visual Tribe Differentiation
- ✅ Territory borders now use tribe colors (gold, neon green, dark red, royal blue)
- ✅ Settlement markers rendered on map with tribe colors
- ✅ Capital indicators with star icon
- ✅ Settlement names displayed with drop shadow
- ✅ Map rebuilds on territory/settlement changes
- ✅ Unit visual categories for new unit types (melee, ranged, cavalry, siege)
- ✅ getTribeColor helper converts hex string to Pixi number

### Phase 10: Advanced Systems
58. ✅ Great People accumulation and spawning
59. ✅ Great Person one-time actions
60. ✅ Golden age triggers (universal + tribe-specific)
61. ✅ Golden age effects
62. ✅ Policy swapping (SWAP_POLICIES action)

#### Phase 10a: Great People System
- ✅ 19 universal great people with unique thresholds and actions
- ✅ 4 tribal great people (Nom, Frank, Genuine Articles, Peblo)
- ✅ GreatPeopleAccumulator tracking (combat, alpha, gold, vibes, kills, captures, trade routes, wonders, buildings)
- ✅ Threshold checking and spawn logic with configurable spawn chance
- ✅ Policy bonuses for GP spawn chance (Clout 65%, Big Addition 80%, Collector 100%)
- ✅ Great person one-time actions (yield buffs, instant production, promotions, golden ages)
- ✅ USE_GREAT_PERSON action handler

#### Phase 10b: Golden Age System
- ✅ 7 universal triggers (3 techs in 5 turns, capture capital, 4th settlement, 20 pop, 2 wonders, 3 great people, 6 trade routes first)
- ✅ 4 tribal triggers (Monkes 500 gold, Geckos Era 3 tech first, DeGods 10 kills, Cets Era 3 culture first)
- ✅ Era-based random effect selection (17 effects across 3 eras)
- ✅ Golden age yield bonuses applied to alpha, vibes, production, gold
- ✅ Combat and mobility bonuses from golden age effects
- ✅ Tech completion tracking for "3 techs in 5 turns" trigger
- ✅ Golden age turn processing (decrement duration, cleanup)

### Phase 11: AI Opponents
63. ✅ AI decision framework
64. ✅ Expansion logic
65. ✅ Military logic with barbarian handling
66. ✅ Research and culture priorities
67. ✅ Diplomacy AI (when to ally, when to war)
68. ✅ Trade route optimization
69. ✅ Wonder race decisions
70. ✅ Lootbox hunting priority

#### Phase 11a: Comprehensive AI System
- ✅ TribePersonality system with behavioral modifiers (aggression, peacefulness, alliance tendencies)
- ✅ Priority-based decision framework (diplomacy → research → culture → production → units)
- ✅ Research AI with tribe-specific tech prioritization
- ✅ Culture AI with tribe-specific culture prioritization
- ✅ Expansion AI (settler movement and settlement founding)
- ✅ Military AI with barbarian hunting priority
- ✅ Scout AI with lootbox hunting and exploration
- ✅ Wonder AI with tribe-specific wonder prioritization

#### Phase 11b: Trade Route System
- ✅ Tech-based trade route capacity (Smart Contracts: 1, Currency: +1, Lending: +1)
- ✅ Monkes tribe bonus: +1 trade route capacity
- ✅ 2-turn formation delay before routes become active
- ✅ Trade route yields: 20% of combined Gold (25% for Allied) + 1 per luxury
- ✅ Pillaging trade routes when settlement takes HP damage
- ✅ UI helpers: getAvailableTradeDestinations(), canCreateTradeRoute(), getTradeRouteSummary()
- ✅ AI trade route optimization with tribe-specific priorities
- ✅ 20 tests for trade route system

#### Phase 11c: Settlement HP & Siege System
- ✅ Settlement HP system (settlements have HP, can be damaged/captured)
- ✅ Siege weapon dual-strength system (separate combatStrength vs settlementStrength)
- ✅ Social Engineer: 20 combat strength, 60 settlement strength (3x)
- ✅ Bombard: 25 combat strength, 75 settlement strength (3x)
- ✅ Siege units are "glass cannons" - weak vs units, strong vs settlements
- ✅ Tank movement reduced from 5 to 4 for balance
- ✅ Updated combat preview to show siege vs settlement effectiveness

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
