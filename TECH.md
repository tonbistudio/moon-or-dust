# Technology Tree

This document defines the technology tree for Tribes. Technologies unlock units, buildings, improvements, and reveal strategic resources.

## Overview

- **30 total technologies** (10 per era)
- Each tech has an Alpha (science) cost that increases by era
- Prerequisites must be researched before a tech becomes available
- Some techs reveal strategic resources (Iron, Horses)
- Some techs require **culture prerequisites** (cross-tree dependencies)

## Era 1: Ancient Age

**Base Cost: 20-40 Alpha**

### Era 1 Tech Details

| Tech | Cost | Prerequisites | Unlocks |
|------|------|---------------|---------|
| **Mining** | 20 | None | Mine improvement, Quarry improvement, reveals Iron resource |
| **Farming** | 20 | Animal Husbandry | Farm improvement, Granary building (+Population) |
| **Animal Husbandry** | 20 | None | Pasture improvement, reveals Horses resource |
| **Smart Contracts** | 25 | Coding | Unlocks Trade, +1 Trading Route, Candy Machine Wonder |
| **Coding** | 25 | None | Library building (+Alpha) |
| **Archery** | 25 | Animal Husbandry | Archer unit |
| **Minting** | 30 | None | Mint improvement, Solanart building (+Gold)|
| **Bronze Working** | 35 | Mining | Warrior unit upgrade, Barracks building (+Combat unit production) |
| **PFPs** | 35 | Coding | Gallery building (+Vibes) |
| **Horseback Riding** | 40 | Farming | Horseman unit, Roads |

---

## Era 2: Classical Age

**Base Cost: 50-80 Alpha**

### Era 2 Tech Details

| Tech | Cost | Prerequisites | Unlocks |
|------|------|---------------|---------|
| **Iron Working** | 50 | Bronze Working | Swordsman unit (requires Iron) |
| **Discord** | 50 | PFPs | Server building (+Population), Creckhouse |
| **Currency** | 55 | Minting, **Culture: OTC Trading** | +1 trade route, Magic Eden Wonder |
| **Staking** | 55 | PFPs, Smart Contracts | Art Upgrader (+Vibes), Taiyo Robotics Factory, The Garage |
| **Lending** | 60 | Smart Contracts | +1 Trade route, Degen Mints Cabana |
| **Matrica** | 65 | Discord, **Culture: Early Empire** | Alpha Hunter Hideout (+Alpha) Social engineer unit, Eternal Bridge |
| **Botting** | 70 | Iron Working | Bot Farm (+Production), Sniper unit |
| **On-chain Gaming** | 70 | Coding, Minting | Arena building (+Combat Unit production) |
| **Priority Fees** | 75 | On-chain Gaming | Knight unit |
| **Defi** | 80 | Currency | Yield Farm building (+Gold) |

---

## Era 3: Renaissance Age

**Base Cost: 100-150 Alpha**

### Era 3 Tech Details

| Tech | Cost | Prerequisites | Unlocks |
|------|------|---------------|---------|
| **Artificial Intelligence** | 100 | Priority Fees | Bot Fighter unit |
| **Ponzinomics** | 100 | Staking | Hype Machine building (+Population), Mindfolk Lumberyard |
| **Hacking** | 110 | Botting, Horseback Riding | Tank unit |
| **Tokenomics** | 110 | Defi | Dex Labs building (+Gold), +1 trade route capacity |
| **Hardware Wallets** | 120 | Iron Working | Ledger Foundry building (+Production) |
| **Siege Weapons** | 120 | Hardware Wallets | Bombard siege unit |
| **Wolf Game** | 130 | Defi | Rockeeter unit |
| **Liquidity Pools** | 140 | Tokenomics, **Culture: Alpha DAOs** | +2 trade route capacity, +5% all yields |
| **Firedancer** | 140 | Priority Fees | +2 mobility for all units |
| **OHM** | 150 | Wolf Game, Liquidity Pools | Cult HQ building (+Vibes) |

---

## Cross-Prerequisites Summary

**Technologies requiring Cultures:**

| Tech | Required Culture | Rationale |
|------|------------------|-----------|
| Currency | OTC Trading | Need trade networks first |
| Matrica | Early Empire | Large-scale projects need organization |
| Liquidity Pools | Alpha DAOs | Need decentralized governance |

---

## Special/Tribal Tech Bonuses

Each tribe has bonuses that affect tech progression:

| Tribe | Tech Bonus |
|-------|------------|
| **Geckos** | -15% Alpha cost for all techs, start with Coding |
| **Monkes** | Free tech when entering new era |
| **DeGods** | Military techs cost -20% Alpha |
| **Cets** | Production techs provide +1 Vibes |

---

## Tech Tree Visualization

```
ERA 1 (Ancient)              ERA 2 (Classical)              ERA 3 (Renaissance)
════════════════             ══════════════════             ═══════════════════

                             ┌─▶ Iron Working ─────────────▶ Hardware Wallets ──▶ Siege Weapons
                             │        │
Mining ──▶ Bronze Working ───┘        └──▶ Botting ────────────────────┐
                                                                       ├──▶ Hacking
Animal Husbandry ──┬──▶ Archery                                        │
                   │                                                   │
                   └──▶ Farming ──▶ Horseback Riding ──────────────────┘


Minting ─────────────────────┬──▶ Currency ──▶ Defi ───────┬──▶ Tokenomics ──▶ Liquidity Pools
                             │                  │          │                          │
                             │                  └──────────┴──▶ Wolf Game ────────────┴──▶ OHM
                             │
                             └──▶ On-chain Gaming ──▶ Priority Fees ──┬──▶ AI
                                       ▲                              └──▶ Firedancer
Coding ──┬─────────────────────────────┘
         │
         ├──▶ PFPs ──────────┬──▶ Discord ──▶ Matrica
         │                   │
         │                   └──▶ Staking ─────────────────▶ Ponzinomics
         │                           ▲
         └──▶ Smart Contracts ───────┴──▶ Lending
```

### Simplified Branch View

```
MILITARY PATH:
Mining → Bronze Working → Iron Working ──┬──→ Hardware Wallets → Siege Weapons
                                         └──→ Botting ─────────────────┐
                                                                       ├──→ Hacking
Animal Husbandry → Farming → Horseback Riding ─────────────────────────┘

ECONOMY PATH:
Minting → Currency → Defi ──┬──→ Tokenomics → Liquidity Pools ──┐
                            └──→ Wolf Game ─────────────────────┴──→ OHM

TECH PATH:
Coding ──┬──→ On-chain Gaming → Priority Fees ──┬──→ AI
         │        ▲                             └──→ Firedancer
Minting ─┘

SOCIAL PATH:
Coding → PFPs ──┬──→ Discord → Matrica
                └──→ Staking → Ponzinomics
                        ▲
Coding → Smart Contracts ──┬─┘
                           └──→ Lending

MOBILITY PATH:
Animal Husbandry ──┬──→ Archery
                   └──→ Farming → Horseback Riding → (Hacking)
```

---

## Implementation Notes

```typescript
interface Tech {
  id: TechId
  name: string
  era: 1 | 2 | 3
  cost: number
  prerequisites: {
    techs: TechId[]
    cultures: CultureId[]  // Cross-tree prerequisites
  }
  unlocks: {
    units?: UnitType[]
    buildings?: BuildingId[]
    improvements?: ImprovementType[]
    resources?: ResourceType[]  // reveals these
    bonuses?: TechBonus[]
  }
}

// Example - simple tech
const MINING: Tech = {
  id: 'mining' as TechId,
  name: 'Mining',
  era: 1,
  cost: 20,
  prerequisites: { techs: [], cultures: [] },
  unlocks: {
    improvements: ['quarry', 'mine'],
    resources: ['iron'],
  },
}

// Example - tech with culture prerequisite
const CURRENCY: Tech = {
  id: 'currency' as TechId,
  name: 'Currency',
  era: 2,
  cost: 55,
  prerequisites: {
    techs: ['minting' as TechId],
    cultures: ['otc_trading' as CultureId],  // Cross-tree requirement!
  },
  unlocks: {
    buildings: ['marketplace'],
  },
}
```

---

## Balancing Guidelines

- Era 1 techs: 20-40 Alpha cost
- Era 2 techs: 50-80 Alpha cost
- Era 3 techs: 100-150 Alpha cost
- Each era should have ~4-5 "starting" techs with no prerequisites
- Military techs branch from production techs
- Economy techs form interconnected web
- Tech/exploration path provides vision and speed bonuses
- Vibes path is shorter but provides unique benefits
