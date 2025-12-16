# Cultures Tree (Governance)

This document defines the cultures tree for Tribes. Cultures unlock policy cards (with mutually exclusive A/B choices) that can be slotted into typed policy slots.

## Overview

- **29 total cultures** (9 in Era 1, 10 in Era 2, 10 in Era 3)
- Each culture has a Vibes cost that increases by era
- Completing a culture grants a choice between 2 policy cards (A or B)
- Each policy card has a **slot type**: Military, Economy, Progress, or Wildcard
- Cards added to pool can be freely swapped when completing any culture
- Some cultures require **tech prerequisites** (cross-tree dependencies)

## Policy Slot System

**Slot Types:**
| Slot | Color | Focus |
|------|-------|-------|
| Military [M] | Red | Combat, units, defense, healing, vision |
| Economy [E] | Yellow | Gold income, trade routes, cost discounts |
| Progress [P] | Blue | Alpha (science), Vibes (culture) bonuses |
| Wildcard [W] | Purple | Production, population, diplomacy, great people, unique effects |

**Starting Slots:** 1 Military, 1 Economy, 0 Progress, 0 Wildcard

**Maximum Slots:** 3 per type

**Slot Progression (12 total unlocks):**
| Culture | Era | Unlocks |
|---------|-----|---------|
| Community | 1 | +1 Wildcard slot |
| Influence | 1 | +1 Military slot |
| OTC Trading | 1 | +1 Economy slot |
| Builder Culture | 1 | +1 Progress slot |
| Whitelisting | 2 | +1 Progress slot |
| Degen Minting | 2 | +1 Economy slot |
| Defensive Tactics | 2 | +1 Military slot |
| Virality | 2 | +1 Wildcard slot |
| Presales | 3 | +1 Economy slot |
| Raiding | 3 | +1 Military slot |
| Innovation | 3 | +1 Progress slot |
| Rugging | 3 | +1 Wildcard slot |

---

## Era 1: Tribal Age

**Base Cost: 15-35 Vibes**

### Era 1 Cultures Tree

```
┌─────────────────┐                     ┌─────────────────┐
│    COMMUNITY    │ [+1 W]              │    INFLUENCE    │ [+1 M]
│   (governance)  │                     │   (diplomacy)   │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         ├───────────────────┐       ┌───────────┴───────────┐
         │                   │       │                       │
         ▼                   ▼       ▼                       ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ BUILDER CULTURE │ │  DEGEN CULTURE  │ │  SOCIAL MEDIA   │ │    MEMEING      │
│  (production)   │ │   (lifestyle)   │ │    (culture)    │ │    (humor)      │
│     [+1 P]      │ │                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘


┌─────────────────┐
│   OTC TRADING   │
│    (economy)    │
│     [+1 E]      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EARLY ADOPTERS │
│   (discovery)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DIAMOND HANDS  │
│   (resolve)     │
└─────────────────┘
```

### Era 1 Culture Details

| Culture | Cost | Prerequisites | Policy A [Slot] | Policy B [Slot] |
|---------|------|---------------|-----------------|-----------------|
| **Community** | 15 | None | **Governance** [P]: +2 Vibes in capital | **Discipline** [M]: +5 unit healing per turn |
| **OTC Trading** | 20 | None | **Escrow** [E]: +2 Gold from trade routes | **Broker** [E]: +10% Gold from all sources |
| **Influence** | 20 | None | **Clout** [W]: 65% chance of earning great people at thresholds | **Networking** [E]: +1 Gold per ally |
| **Builder Culture** | 25 | Community | **Craftsmanship** [W]: +15% Production for buildings | **Grind** [W]: +1 Production in all settlements |
| **Degen Culture** | 25 | Community | **Full Send** [M]: +10% combat strength, -5% defense | **Ape In** [W]: +20% Production when behind in score |
| **Social Media** | 25 | Influence | **Followers** [P]: +1 Vibes per population | **Engagement** [P]: +15% Vibes generation |
| **Memeing** | 25 | Influence | **Shitposting** [M]: Enemy units in your territory -1 combat strength | **Good Vibes** [P]: +1 Vibes per settlement | Turtlers Hideout |
| **Early Adopters** | 30 | OTC Trading | **First Mover** [E]: +1 trade route capacity | **Scout Bonus** [M]: +1 Scout vision |
| **Diamond Hands** | 35 | Early Adopters | **HODL** [M]: Units +25% defense below 50% HP | **Paper Hands** [W]: -50% war weariness | Unlocks Degen Ape Emporium |

*Era 1 Distribution: M=5, E=4, P=5, W=6*

---

## Era 2: Classical Age

**Base Cost: 45-70 Vibes**

### Era 2 Cultures Tree

```
From Community:
                    ┌─────────────────┐
                    │       GM        │
                    │  (happiness)    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ FOLLOW FOR      │
                    │    FOLLOW       │
                    │  (reciprocity)  │
                    └─────────────────┘

From OTC Trading + Degen Culture:
┌─────────────────┐         ┌─────────────────┐
│   ALPHA DAOS    │         │   WHITELISTING  │
│    (economy)    │         │   (exclusivity) │
│                 │         │     [+1 P]      │
└────────┬────────┘         └─────────────────┘
         │
         ▼
┌─────────────────┐
│  DEGEN MINTING  │ ◀── Requires Degen Culture
│   (high risk)   │
│     [+1 E]      │
└─────────────────┘

From Influence:
┌─────────────────┐         ┌─────────────────┐
│    FUDDING      │         │    VIRALITY     │
│   (warfare)     │         │ (great people)  │
└────────┬────────┘         │     [+1 W]      │
         │                  └─────────────────┘
         ▼
┌─────────────────┐
│   DEFENSIVE     │
│    TACTICS      │
│   (defense)     │
│     [+1 M]      │
└─────────────────┘

From Memeing:
┌─────────────────┐
│ MEMECOIN MANIA  │
│  (speculation)  │
└─────────────────┘
```

### Era 2 Culture Details

| Culture | Cost | Prerequisites | Policy A [Slot] | Policy B [Slot] |
|---------|------|---------------|-----------------|-----------------|
| **GM** | 45 | Community | **Positive Vibes** [P]: +2 Vibes in all settlements | **Good Morning** [W]: Hostile tribes become Neutral after 3 turns (instead of 5) |
| **Whitelisting** | 45 | Early Adopters | **Exclusive Access** [E]: +10% Gold from improvements | **VIP List** [W]: Alliance cost -25% |
| **Alpha DAOs** | 50 | OTC Trading | **Big Addition** [W]: 80% chance of earning great people at thresholds | **Treasury** [E]: +2 Trade Route capacity | Unlocks Boogle Graveyard |
| **Follow for Follow** | 50 | GM | **Mutual Support** [M]: Allies heal +5 HP/turn | **Community Building** [W]: +1 Population when settling |
| **Fudding** | 55 | Influence | **FUD Campaign** [M]: Enemy units -1 combat strength when attacking you | **Spread Doubt** [W]: Enemies cannot form alliances with each other | Unlocks Alpha Art Gallery | 
| **Virality** | 55 | Social Media | **Going Viral** [P]: +20% Vibes when completing wonders | **Influencer** [W]: Great Person points +25% |
| **Defensive Tactics** | 60 | Fudding | **Diamond Formation** [W]: +100% production for walls | **Fortify** [M]: +25% defense in owned territory |
| **Degen Minting** | 60 | Alpha DAOs, Degen Culture | **FOMO** [W]: +25% Production when behind in score | **Yolo** [M]: Units +15% attack, -10% defense |
| **Memecoin Mania** | 65 | Memeing | **Pump It** [E]: +20% Gold when completing cultures | **Viral Spread** [P]: +2 Vibes per enemy unit killed |

*Era 2 Distribution: M=5, E=5, P=5, W=5*

---

## Era 3: Renaissance Age

**Base Cost: 80-120 Vibes**

### Era 3 Cultures Tree

```
From GM:
┌─────────────────┐
│     RAIDING     │
│ (pop/military)  │
│     [+1 M]      │
└─────────────────┘

From Memecoin Mania:
┌─────────────────┐
│    TRENCHING    │ [Req: Discord]
│  (persistence)  │
└─────────────────┘

From Builder Culture + Whitelisting:
┌─────────────────┐
│   INNOVATION    │ [Req: Priority Fees]
│     (tech)      │
│     [+1 P]      │
└─────────────────┘

From Virality:
┌─────────────────┐
│  HARD SHILLING  │
│   (outreach)    │
└─────────────────┘

From Whitelisting:
┌─────────────────┐
│    1 OF 1s      │
│   (economy)     │
└─────────────────┘

From Alpha DAOs:
┌─────────────────┐         ┌─────────────────┐
│    PRESALES     │         │    AUCTIONS     │
│   (economy)     │         │   (economy)     │
│     [+1 E]      │         │                 │
│ [Req: Matrica]  │         │                 │
└─────────────────┘         └─────────────────┘

From Degen Minting + Delisting:
┌─────────────────┐
│    SWEEPING     │
│ (econ/offense)  │
└─────────────────┘

From Diamond Hands + Follow for Follow:
┌─────────────────┐
│   DELISTING     │
│ (econ/defense)  │
└─────────────────┘

From Fudding:
┌─────────────────┐
│    RUGGING      │ [Req: Hacking]
│   (military)    │
│     [+1 W]      │
└─────────────────┘
```

### Era 3 Culture Details

| Culture | Cost | Prerequisites | Policy A [Slot] | Policy B [Slot] |
|---------|------|---------------|-----------------|-----------------|
| **Raiding** | 80 | GM | **Pillage Bonus** [M]: +50% Gold from pillaging | **War Party** [M]: +1 Movement when attacking |
| **Innovation** | 80 | Builder Culture, Whitelisting, **Tech: Priority Fees** | **R&D** [P]: +20% Alpha generation | **Breakthrough** [P]: Buildings +2 Alpha |
| **Hard Shilling** | 85 | Virality | **Hype Train** [M]: +25% combat XP gain | **Momentum** [P]: +2 Vibes per unit promoted | Unlocks The Portal
| **1 of 1s** | 85 | Whitelisting | **Unique Art** [P]: +3 Vibes per wonder | **Collector** [W]: 100% chance of earning great people at thresholds |
| **Auctions** | 90 | Alpha DAOs | **Bidding War** [E]: +25% Gold income | **Reserve Price** [E]: +20 Gold income per settlement |
| **Presales** | 90 | Alpha DAOs, **Tech: Matrica** | **Early Access** [E]: -25% building cost | **Allocation** [W]: +3 trade route capacity |
| **Trenching** | 95 | Memecoin Mania, **Tech: Discord** | **In the Trenches** [M]: +15% combat strength when outnumbered | **Never Selling** [W]: +1 Floor Price per 5 population |
| **Delisting** | 100 | Diamond Hands, Follow for Follow | **Floor Defense** [M]: Settlements +50% defense | **Exit Liquidity** [E]: +25 Gold when losing units |
| **Sweeping** | 110 | Degen Minting, Delisting | **Buy the Dip** [E]: +30% Gold from trade routes | **Collection Complete** [W]: +5 Floor Price per 10 tiles |
| **Rugging** | 120 | Fudding, **Tech: Hacking** | **Exit Scam** [M]: +100% pillage damage | **Insider Trading** [W]: See enemy production queues | Unlocks Balloonsville Lair |

*Era 3 Distribution: M=6, E=5, P=4, W=5*

---

## Cross-Prerequisites Summary

**Cultures requiring Technologies:**

| Culture | Required Tech | Rationale |
|---------|---------------|-----------|
| Innovation | Priority Fees | Need blockchain optimization for innovation |
| Trenching | Discord | Community coordination for sustained commitment |
| Presales | Matrica | Need identity verification for presale access |
| Rugging | Hacking | Need technical skills for exploits |

---

## Full Cultures Tree Visualization

```
ERA 1 (Tribal)              ERA 2 (Classical)           ERA 3 (Renaissance)
══════════════              ═════════════════           ═══════════════════

Community ─────────────────▶ GM ────────────────────────▶ Raiding [+1 M]
[+1 W]                           │
     │                           └──▶ Follow for Follow ───────▶ Delisting (+ Diamond Hands)
     │
     ├──▶ Builder Culture [+1 P]
     │        │
     │        └─────────────────────────────────────────────▶ Innovation [+1 P]
     │                                                        [Req: Priority Fees and Whitelisting]
     │
     └──▶ Degen Culture ───────▶ Degen Minting [+1 E] ─────────────▶ Sweeping (Requires Delisting)
                                 (+ Alpha DAOs)


Influence [+1 M] ──────────────────▶ Fudding ──────────────────▶ Rugging [+1 W]
     │                           │                        [Req: Hacking]
     │                           │
     │                           └──▶ Defensive Tactics [+1 M]
     │
     ├──▶ Social Media ─────────▶ Virality [+1 W] ─────────────▶ Hard Shilling
     │
     └──▶ Memeing ──────────────▶ Memecoin Mania ─────────────▶ Trenching [Req: Discord]


OTC Trading [+1 E] ────────────────▶ Alpha DAOs ───────────────┬──▶ Presales [+1 E] [Req: Matrica]
     │                                                          └──▶ Auctions
     │
     └──▶ Early Adopters ───────▶ Whitelisting [+1 P]  ─────────▶ 1 of 1s
              │
              └──▶ Diamond Hands ─────────────────────────────────▶ Delisting (+ Follow for Follow)



---

## Slot Type Distribution by Era

| Era | Military [M] | Economy [E] | Progress [P] | Wildcard [W] |
|-----|--------------|-------------|--------------|--------------|
| Era 1 | 5 | 4 | 4 | 5 |
| Era 2 | 5 | 5 | 5 | 5 |
| Era 3 | 6 | 5 | 4 | 5 |
| **Total** | **16** | **14** | **13** | **15** |

This distribution is balanced across all four slot types. Military cards focus on combat bonuses. Economy cards provide gold and trade benefits. Progress cards boost Alpha and Vibes generation. Wildcard cards cover production, population, diplomacy, and unique effects.

---

## Tribal Culture Bonuses

| Tribe | Culture Bonus |
|-------|---------------|
| **Cets** | -15% Vibes cost for all cultures |
| **Monkes** | Start with +1 Economic slot |
| **DeGods** | Military policy effects +10% stronger |
| **Geckos** | Economic policies also grant +5% Alpha |

---

## NFT-Themed Cultures Explained

### Degen Culture (Era 1)
The foundational embrace of the degen lifestyle - high risk, high reward mentality.
- **Full Send** [M]: Aggressive combat bonus at cost of defense
- **Ape In** [W]: Catch-up mechanic when behind in score

### Diamond Hands (Era 1)
Represents the crypto/NFT culture of holding through volatility.
- **HODL** [M]: Defensive bonus when damaged - "hold the line"
- **Paper Hands** [W]: War weariness reduction - knowing when to exit

### Degen Minting (Era 2)
Represents the high-risk, high-reward NFT minting experience. Requires embracing Degen Culture first.
- **FOMO** [W]: Enhanced catch-up mechanic for players behind
- **Yolo** [M]: Aggressive but risky combat bonus

### Hard Shilling (Era 3)
Taking promotion to the extreme - maximum outreach and influence.
- **Hype Train** [M]: Enhanced combat XP for experienced shillers
- **Momentum** [P]: Vibes generation from unit promotions

### Trenching (Era 3)
Staying committed through the worst market conditions - true believer mentality.
- **In the Trenches** [M]: Combat bonus when fighting against the odds
- **Never Selling** [W]: Floor Price bonus for population - commitment pays off

### Sweeping (Era 3)
The act of buying up entire collections.
- **Buy the Dip** [E]: Enhanced trade income
- **Collection Complete** [W]: Territory-based victory points

### Rugging (Era 3)
The dark side of crypto culture - exploits and exits.
- **Exit Scam** [M]: Devastating pillage attacks
- **Insider Trading** [W]: Intelligence on enemies

---

## Implementation Notes

```typescript
type PolicySlotType = 'military' | 'economy' | 'progress' | 'wildcard'

interface Culture {
  id: CultureId
  name: string
  era: 1 | 2 | 3
  cost: number
  prerequisites: {
    cultures: CultureId[]
    techs: TechId[]  // Cross-tree prerequisites
  }
  policyChoices: [PolicyCard, PolicyCard]  // A and B options
  unlocks?: {
    slots?: Partial<Record<PolicySlotType, number>>
    features?: string[]
  }
}

interface PolicyCard {
  id: PolicyId
  name: string
  description: string
  choice: 'a' | 'b'
  slotType: PolicySlotType
  cultureId: CultureId
  effect: PolicyEffect
}

interface PlayerPolicies {
  slots: {
    military: number   // Combat, units, defense, healing, vision
    economy: number    // Gold income, trade routes, cost discounts
    progress: number   // Alpha (science), Vibes (culture) bonuses
    wildcard: number   // Production, population, diplomacy, great people, unique
  }
  pool: PolicyId[]      // All unlocked cards (one per completed culture)
  active: PolicyId[]    // Currently slotted cards
}

// Example
const COMMUNITY: Culture = {
  id: 'community' as CultureId,
  name: 'Community',
  era: 1,
  cost: 15,
  prerequisites: { cultures: [], techs: [] },
  policyChoices: [
    {
      id: 'governance' as PolicyId,
      name: 'Governance',
      description: '+2 Vibes in capital',
      choice: 'a',
      slotType: 'progress',
      cultureId: 'community' as CultureId,
      effect: { type: 'capital_vibes', amount: 2 },
    },
    {
      id: 'discipline' as PolicyId,
      name: 'Discipline',
      description: '+5 unit healing per turn',
      choice: 'b',
      slotType: 'military',
      cultureId: 'community' as CultureId,
      effect: { type: 'unit_healing', amount: 5 },
    },
  ],
  unlocks: {
    slots: { wildcard: 1 },
  },
}

const RUGGING: Culture = {
  id: 'rugging' as CultureId,
  name: 'Rugging',
  era: 3,
  cost: 120,
  prerequisites: {
    cultures: ['fudding' as CultureId],
    techs: ['hacking' as TechId],  // Cross-tree requirement!
  },
  policyChoices: [
    {
      id: 'exit_scam' as PolicyId,
      name: 'Exit Scam',
      description: '+100% pillage damage',
      choice: 'a',
      slotType: 'military',
      cultureId: 'rugging' as CultureId,
      effect: { type: 'pillage_bonus', percent: 100 },
    },
    {
      id: 'insider_trading' as PolicyId,
      name: 'Insider Trading',
      description: 'See enemy production queues',
      choice: 'b',
      slotType: 'wildcard',
      cultureId: 'rugging' as CultureId,
      effect: { type: 'enemy_vision', scope: 'production' },
    },
  ],
}
```

---

## Balancing Guidelines

- Era 1 cultures: 15-35 Vibes cost
- Era 2 cultures: 45-70 Vibes cost
- Era 3 cultures: 80-120 Vibes cost
- **Military [M]** cards focus on combat, units, defense, healing, and vision
- **Economy [E]** cards focus on gold income, trade routes, and cost discounts
- **Progress [P]** cards focus on Alpha (science) and Vibes (culture) bonuses
- **Wildcard [W]** cards cover production, population, diplomacy, great people, and unique effects
- Cross-tree prerequisites create meaningful decision points
- Each era should have balanced options across all slot types
- Maximum 3 slots per type ensures strategic choices in card selection
