# Tribes: New Mechanics Brainstorm

This document summarizes the new game mechanics developed during brainstorming, building on the core Civ-style gameplay.

---

## Floor Price (Victory Score)

The always-visible score that determines the winner at turn 20. Named after the NFT metric everyone obsesses over.

### Calculation

| Category | Points | Thematic Reasoning |
|----------|--------|-------------------|
| Settlements owned | 10 per settlement | More collections = higher value |
| Population (total) | 1 per pop | Community size matters |
| Land tiles controlled | 1 per tile | Territory = mindshare |
| Technologies researched | 5 per tech | Innovation drives value |
| Civics unlocked | 5 per civic | Good governance = trust |
| Units alive | 2 per unit | Active community members |
| Enemy units killed | 3 per kill | Winning battles for attention |
| Gold in treasury | 1 per 10 gold | Treasury strength |
| Wonders | 50-100 per wonder | Major achievements |
| Rare+ units alive | 2-10 per unit | Premium holdings |

### UI Display

- Always visible in top bar
- Shows your Floor Price and rank vs opponents
- Updates in real-time as you take actions
- End-game screen shows final rankings with full breakdown

---

## Lootboxes (Exploration Rewards)

Mystery tiles scattered across the map that reward exploration. When a unit steps on a Lootbox tile, the player receives a random reward.

### Rewards

| Reward | Effect |
|--------|--------|
| **Airdrop** | Instant gold bonus |
| **Alpha Leak** | Free random technology |
| **OG Holder** | Free military unit spawns at nearest settlement |
| **Community Growth** | +3 population to capital |
| **Scout** | Reveals large area of map |

### Placement Rules

- 4-6 Lootboxes per map (scales with map size)
- Never spawn within 2 tiles of a starting position
- Tend to spawn in corners, edges, or hard-to-reach areas
- Encourages aggressive scouting and exploration

### Visual Design

- Glowing mystery box icon on tile
- Opening animation when claimed
- Distinct visual/sound for each reward type

---

## Population Bar + Milestone Rewards

Each settlement has a visible progress bar showing growth toward the next level. This creates a satisfying feedback loop and meaningful choices.

### How Population Grows

- Building improvements (farms, mines, etc.) add population
- Harvesting resources adds population
- Some buildings provide passive population growth
- Lootbox rewards can add population

### Population Bar Visual

- Clear progress bar beneath each settlement
- Shows current pop / required pop for next level
- Fills up as you develop the settlement's territory
- Satisfying "level up" animation when bar completes

### Milestone Rewards

When a settlement levels up, the player chooses between two rewards:

| Level | Option A | Option B |
|-------|----------|----------|
| 2 | **Workshop** (+1 Gold/turn) | **Scout** (free scout unit) |
| 3 | **Bonus Gold** (+10 Gold instantly) | **Border Expansion** (+1 tile radius) |
| 4 | **Population Boom** (+3 pop) | **Culture Push** (+5 Culture) |
| 5+ | **Unique Unit** (tribe's special unit) | **Monument** (+20 Floor Price) |

---

## Unit Minting (Rarity System)

When you train any military unit, it rolls a rarity that affects its stats. This mirrors the NFT minting experience where you hope for a rare pull.

### Rarity Tiers

| Rarity | Chance | Visual | Stat Bonus |
|--------|--------|--------|------------|
| **Common** | 50% | No border | Base stats |
| **Uncommon** | 30% | Green border | +1 combat strength |
| **Rare** | 15% | Blue border | +1 combat, +1 movement |
| **Epic** | 4% | Purple border | +2 combat, +1 movement |
| **Legendary** | 1% | Gold border + glow | +3 combat, +1 movement, +1 vision |

### Floor Price Bonus for Rare Units

Rare+ units alive at end of game add bonus Floor Price:

| Rarity | Floor Price Bonus |
|--------|-------------------|
| Common | +0 |
| Uncommon | +0 |
| Rare | +2 |
| Epic | +5 |
| Legendary | +10 |

### Design Notes

- **Applies to:** All military units (Scout, Warrior, Ranged, unique units)
- **Does not apply to:** Settlers, Builders (non-combat units)
- **Visual distinction:** Colored border or glow around unit sprite
- **Stacks with unique unit bonuses:** A legendary DeadGod would be terrifying
- **Creates stories:** Players remember their lucky pulls and clutch moments

---

## Wonders (10 Total, Exclusive)

Major buildings that only one civilization can build — first to complete it owns it forever. Each wonder references a real Solana project, rewarding community knowledge.

### Wonder List

| Wonder | Reference | Category | Effect |
|--------|-----------|----------|--------|
| **Candy Machine** | Metaplex | Tech | Faster research or free tech on completion |
| **The Portal** | Portal NFTs | Tech | Reveals entire map or enables unit teleportation |
| **Magic Eden** | Magic Eden | Economy | +Gold/turn or bonus from all trades |
| **Boogle Graveyard** | Boogles | Economy | +Gold from enemy unit kills |
| **Degen Ape Emporium** | Degen Apes | Culture | +Culture/turn or border pressure on enemies |
| **Alpha Art Gallery** | Alpha Art | Culture | +Floor Price per tech owned |
| **SolBear Lair** | SolBears | Military | +Combat strength for all units or free units |
| **Turtles Hideout** | Turtles | Military | +Defense for all units or passive healing |
| **Taiyo Robotics Factory** | Taiyo Robotics | Production | +Production/turn or faster build times |
| **Mindfolk Lumberyard** | Mindfolk | Production | +Production from forest tiles |

### Balance

- 2 Tech wonders
- 2 Economy wonders
- 2 Culture wonders
- 2 Military wonders
- 2 Production wonders

### Floor Price Value

- Most wonders: +50 Floor Price
- Can adjust per wonder based on effect strength

### Strategic Impact

- Creates race conditions between players
- Forces decisions: rush a wonder vs expand vs military
- Some wonders synergize with tribe specialties

---

## Alpha (Science Rename)

The Science yield is renamed to **Alpha** — fits the NFT/crypto theme where "alpha" means insider knowledge, valuable information, and early access.

- Displayed as "Alpha" in all UI
- Tech tree progress measured in Alpha
- Thematically: researching = gathering alpha

---

## Timeline Framing (September 2021 - May 2022)

The game represents the NFT golden age. This is purely atmospheric flavor, not mechanical.

### Where It Appears

- Turn counter (optionally shows months instead of turn numbers)
- Loading screen flavor text
- End game screen messaging ("The mint has closed...")
- Tribe descriptions and lore
- Occasional tooltip flavor text

### Why It Works

- Nostalgia for players who lived through it
- Gives the game a unique identity vs generic Civ clones
- Doesn't require NFT knowledge to play — it's just flavor

---

## NFT-Themed Content (Light Touch)

NFT flavor as accent, not total reskin. The game is a civilization builder first.

### Themed Yields

- **Alpha** (science) — the only renamed yield

### Themed Resources (2-3 total)

- **Whitelists** — luxury resource, +growth or +gold
- **Alpha Leaks** — luxury resource, +science

### Themed Techs (2-3 total)

- **PFP Art** — unlocks cultural buildings
- **Smart Contracts** — unlocks advanced economy buildings
- **On-Chain Governance** — unlocks late civics

### Themed Civics (2-3 total)

- **GM Culture** — loyalty/happiness bonus
- **Diamond Hands** — units fight to death, no retreat
- **DAO Governance** — additional policy slots

---

## Summary: What Makes This Game Unique

1. **Floor Price** — Victory score with NFT-native naming, always visible
2. **Lootboxes** — Exploration rewards that feel like opening mystery boxes
3. **Unit Minting** — Rarity tiers when training units, chase that legendary pull
4. **Milestone Rewards** — Choose between bonuses when settlements level up
5. **Wonders** — Race to build exclusive buildings referencing Solana projects
6. **Tribal Identity** — Six tribes based on NFT communities with unique units/buildings
7. **Timeline** — Set during the NFT golden age (Sept 2021 - May 2022)
8. **Light Theming** — NFT flavor as accent without overwhelming core Civ gameplay

These mechanics combine proven 4X engagement loops with NFT culture touchpoints that will resonate with your target audience.
