# Cultures Tree (Governance)

This document defines the cultures tree for Tribes. Cultures unlock policy cards (with mutually exclusive A/B choices) that can be slotted into typed policy slots.

## Overview

- **28 total cultures** (9 in Era 1, 10 in Era 2, 9 in Era 3)
- Each culture has a Vibes cost that increases by era
- Completing a culture grants a choice between 2 policy cards (A or B)
- Each policy card has a **slot type**: Military, Economy, Progress, or Wildcard
- Cards added to pool can be freely swapped when completing any culture
- Some cultures require **tech prerequisites** (cross-tree dependencies)
- **Era gate**: To unlock Era N+1 cultures, you must have unlocked at least 2 Era N cultures

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
| Raiding | 2 | +1 Military slot |
| Presales | 3 | +1 Economy slot |
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
| **Community** | 15 | None | **Welcome Party** [P]: +2 Vibes in capital | **Strong Together** [M]: +5 unit healing per turn |
| **OTC Trading** | 20 | None | **Foxy Swap** [E]: +2 Gold from trade routes | **Broker** [E]: +10% Gold from all sources |
| **Influence** | 20 | None | **Clout** [W]: 65% chance of earning great people at thresholds | **KOL Status** [E]: +5 Gold base, +3 Gold per ally |
| **Builder Culture** | 25 | Community | **Craftsmanship** [W]: +15% Production for buildings | **Grind** [W]: +1 Production in all settlements |
| **Degen Culture** | 25 | Community | **Full Send** [M]: +10% combat strength, -5% defense | **Ape In** [W]: +10% Production (+20% when behind in score) |
| **Social Media** | 25 | Influence | **Banger Post** [P]: +2 Vibes per population level in capital | **Engagement** [P]: +15% Vibes generation |
| **Memeing** | 25 | Influence | **Shitposting** [M]: Enemy units in your territory -1 combat strength | **4-chan** [P]: +1 Vibes per settlement |
| **Early Adopters** | 30 | OTC Trading | **First Mover** [E]: +1 trade route capacity | **Recon** [M]: +1 vision for all units |
| **Diamond Hands** | 35 | Early Adopters | **HODL** [M]: Units +25% defense below 50% HP | **Exit Strategy** [W]: Units heal +10 HP when in friendly territory |

*Era 1 Distribution: M=5, E=4, P=5, W=6*

---

## Era 2: Classical Age

**Base Cost: 45-70 Vibes**

### Era 2 Cultures Tree

```
From Community + Influence:
                    ┌─────────────────┐
                    │       GM        │
                    │  (happiness)    │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
           ┌─────────────────┐ ┌─────────────────┐
           │ FOLLOW FOR      │ │     RAIDING     │
           │    FOLLOW       │ │ (pop/military)  │
           │  (reciprocity)  │ │     [+1 M]      │
           └─────────────────┘ └─────────────────┘

From OTC Trading + Community:
┌─────────────────┐
│   ALPHA DAOS    │
│    (economy)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DEGEN MINTING  │ ◀── Also requires Degen Culture
│   (high risk)   │
│     [+1 E]      │
└─────────────────┘

From Early Adopters:
┌─────────────────┐
│   WHITELISTING  │
│   (exclusivity) │
│     [+1 P]      │
└─────────────────┘

From Influence + Memeing:
┌─────────────────┐
│    FUDDING      │
│   (warfare)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DEFENSIVE     │
│    TACTICS      │
│   (defense)     │
│     [+1 M]      │
└─────────────────┘

From Social Media:
┌─────────────────┐
│    VIRALITY     │
│ (great people)  │
│     [+1 W]      │
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
| **GM** | 45 | Community, Influence | **WAGMI** [P]: +2 Vibes in all settlements | **GN** [W]: +3 Vibes per Friendly or Allied tribe |
| **Whitelisting** | 45 | Early Adopters | **Double OG** [E]: +10% Gold from improvements | **Inner Circle** [W]: +2 Trade routes with Friendly or Allied tribes |
| **Alpha DAOs** | 50 | OTC Trading, Community | **Big Addition** [W]: 80% chance of earning great people at thresholds | **Networking** [E]: +2 Trade Route capacity |
| **Follow for Follow** | 50 | GM | **Mutual Support** [M]: Adjacent friendly units heal +3 HP/turn | **Community Building** [W]: +1 Population when settling |
| **Fudding** | 55 | Influence, Memeing | **FUD Campaign** [M]: Enemy units -1 combat strength when attacking you | **Dev Asleep?** [W]: Enemies at war with you have -33% defense |
| **Virality** | 55 | Social Media | **100k Likes** [P]: +30% wonder production speed | **Retweet Bonanza** [W]: Great Person points +25% |
| **Defensive Tactics** | 60 | Fudding | **Diamond Formation** [W]: +100% production for walls | **Fortify** [M]: +25% defense in owned territory |
| **Degen Minting** | 60 | Alpha DAOs, Degen Culture | **FOMO** [W]: +15% Production (+25% when behind in score) | **YOLO** [M]: Units +15% attack, -10% defense |
| **Memecoin Mania** | 65 | Memeing | **SENDU** [E]: +5 Gold per culture unlocked | **The Ticker Is** [P]: +2 Vibes per enemy unit killed |
| **Raiding** | 70 | GM | **Reply Army** [M]: +100% pillage damage | **To the Streets** [M]: +2 Movement for Cavalry units |

*Era 2 Distribution: M=6, E=4, P=4, W=6*

---

## Era 3: Renaissance Age

**Base Cost: 80-120 Vibes**

### Era 3 Cultures Tree

```
From Whitelisting + GM:
┌─────────────────┐         ┌─────────────────┐
│   INNOVATION    │         │    1 OF 1s      │
│     (tech)      │         │   (economy)     │
│     [+1 P]      │         │                 │
│ [Req: Pri Fees] │         │                 │
└─────────────────┘         └─────────────────┘

From Virality + Memecoin Mania:
┌─────────────────┐         ┌─────────────────┐
│  HARD SHILLING  │         │    TRENCHING    │
│   (outreach)    │         │  (persistence)  │
│                 │         │ [Req: Discord]  │
└─────────────────┘         └─────────────────┘

From Alpha DAOs + Whitelisting:
┌─────────────────┐
│    AUCTIONS     │
│   (economy)     │
└─────────────────┘

From Alpha DAOs + Degen Minting:
┌─────────────────┐
│    PRESALES     │
│   (economy)     │
│     [+1 E]      │
│ [Req: Matrica]  │
└─────────────────┘

From Follow for Follow + Degen Minting:
┌─────────────────┐
│   DELISTING     │
│ (econ/defense)  │
└─────────────────┘

From Degen Minting + Hard Shilling:
┌─────────────────┐
│    SWEEPING     │
│ (econ/offense)  │
└─────────────────┘

From Fudding + Defensive Tactics:
┌─────────────────┐
│    RUGGING      │
│   (military)    │
│     [+1 W]      │
│ [Req: Hacking]  │
└─────────────────┘
```

### Era 3 Culture Details

| Culture | Cost | Prerequisites | Policy A [Slot] | Policy B [Slot] |
|---------|------|---------------|-----------------|-----------------|
| **Innovation** | 80 | Whitelisting, GM, **Tech: Priority Fees** | **R&D** [P]: +20% Alpha generation | **Breakthrough** [P]: Buildings +2 Alpha |
| **1 of 1s** | 85 | Whitelisting, GM | **Customs** [P]: +3 Vibes per wonder | **Collector** [W]: 90% chance of earning great people at thresholds |
| **Hard Shilling** | 85 | Virality, Memecoin Mania | **Hype Train** [M]: Units start with 1 free promotion | **Pump It Up** [P]: +5 Vibes per unit promoted |
| **Auctions** | 90 | Alpha DAOs, Whitelisting | **Bidding War** [E]: +25% Gold income | **Reserve Price** [E]: +15 Gold income per settlement |
| **Presales** | 90 | Alpha DAOs, Degen Minting, **Tech: Matrica** | **Early Access** [E]: -25% building cost | **Allocation** [W]: +3 trade route capacity |
| **Trenching** | 95 | Memecoin Mania, Virality, **Tech: Discord** | **In the Trenches** [M]: +25% combat strength when defending | **Just Scanning** [W]: +1 Floor Price per 3 population |
| **Delisting** | 100 | Follow for Follow, Degen Minting | **Floor Defense** [M]: Settlements +75% defense | **Delist Train** [E]: +50 Gold income per wonder built |
| **Sweeping** | 110 | Degen Minting, Hard Shilling | **Buy the Dip** [E]: +30% Gold from trade routes | **Take Out the Brooms** [W]: +5 Floor Price per 10 tiles |
| **Rugging** | 120 | Fudding, Defensive Tactics, **Tech: Hacking** | **Ate on That, Twin** [M]: +50% Gold from pillaging, heal 5 HP on kill | **Sends His Regards** [W]: +50 Gold per enemy kill in your territory |

*Era 3 Distribution: M=4, E=5, P=4, W=5*

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
==============              =================           ===================

Community ──┬──────────────▶ GM ────────────────────┬──▶ Innovation [+1 P]
[+1 W]      │               (+ Influence)          │    [Req: Priority Fees]
            │                    │                 │    (+ Whitelisting)
            │                    ├──▶ Follow ──────┼──▶ Delisting
            │                    │    for Follow   │    (+ Degen Minting)
            │                    │                 │
            │                    └──▶ Raiding ─────┘──▶ 1 of 1s
            │                         [+1 M]            (+ Whitelisting)
            │
            ├──▶ Builder Culture [+1 P]
            │
            └──▶ Degen Culture ─────────────────────▶ Degen Minting [+1 E]
                                                     (+ Alpha DAOs)
                                                          │
                                                          ├──▶ Presales [+1 E]
                                                          │    [Req: Matrica]
                                                          │
                                                          ├──▶ Delisting
                                                          │    (+ Follow for Follow)
                                                          │
                                                          └──▶ Sweeping
                                                               (+ Hard Shilling)


Influence ──┬──────────────▶ Fudding ───────────────▶ Rugging [+1 W]
[+1 M]      │               (+ Memeing)              [Req: Hacking]
            │                    │                   (+ Defensive Tactics)
            │                    │
            │                    └──▶ Defensive Tactics [+1 M]
            │
            ├──▶ Social Media ─▶ Virality [+1 W] ───▶ Hard Shilling ──▶ Sweeping
            │                                        (+ Memecoin Mania) (+ Degen Minting)
            │
            └──▶ Memeing ──────▶ Memecoin Mania ────▶ Trenching [Req: Discord]
                                                     (+ Virality)


OTC Trading ──┬────────────▶ Alpha DAOs ────────────┬──▶ Auctions
[+1 E]        │             (+ Community)           │    (+ Whitelisting)
              │                                     │
              │                                     └──▶ Presales [+1 E]
              │                                          [Req: Matrica]
              │                                          (+ Degen Minting)
              │
              └──▶ Early Adopters ──▶ Whitelisting [+1 P] ──▶ Auctions
                        │                                     (+ Alpha DAOs)
                        │
                        └──▶ Diamond Hands
```

---

## Slot Type Distribution by Era

| Era | Military [M] | Economy [E] | Progress [P] | Wildcard [W] | Total |
|-----|--------------|-------------|--------------|--------------|-------|
| Era 1 | 5 | 4 | 5 | 6 | 20 |
| Era 2 | 6 | 4 | 4 | 6 | 20 |
| Era 3 | 4 | 5 | 4 | 5 | 18 |
| **Total** | **15** | **13** | **13** | **17** | **58** |

This distribution is balanced across all four slot types. Military cards focus on combat bonuses. Economy cards provide gold and trade benefits. Progress cards boost Alpha and Vibes generation. Wildcard cards cover production, population, diplomacy, great people, and unique effects.

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
- **Ape In** [W]: Production bonus that increases when behind in score

### Diamond Hands (Era 1)
Represents the crypto/NFT culture of holding through volatility.
- **HODL** [M]: Defensive bonus when damaged - "hold the line"
- **Exit Strategy** [W]: Healing bonus in friendly territory - knowing when to retreat

### Degen Minting (Era 2)
Represents the high-risk, high-reward NFT minting experience. Requires embracing Degen Culture first.
- **FOMO** [W]: Production bonus that increases when behind in score
- **YOLO** [M]: Aggressive but risky combat bonus

### Raiding (Era 2)
Aggressive expansion through raids and cavalry dominance.
- **Reply Army** [M]: +100% pillage damage - devastating economic warfare
- **To the Streets** [M]: +2 Movement for Cavalry - lightning fast strikes

### Fudding (Era 2)
Spreading fear, uncertainty, and doubt to weaken enemies.
- **FUD Campaign** [M]: Enemy units -1 combat strength when attacking you - defensive psychological warfare
- **Dev Asleep?** [W]: Enemies at war with you have -33% defense - exploit their weaknesses

### Hard Shilling (Era 3)
Taking promotion to the extreme - maximum outreach and influence.
- **Hype Train** [M]: Units start battle-ready with a free promotion
- **Pump It Up** [P]: Massive Vibes from unit promotions (+5 each)

### Trenching (Era 3)
Staying committed through the worst market conditions - true believer mentality.
- **In the Trenches** [M]: +25% combat bonus when defending - hold the line
- **Just Scanning** [W]: Floor Price bonus for population (+1 per 3 pop) - commitment pays off

### Delisting (Era 3)
Removing assets from the market - defensive economics.
- **Floor Defense** [M]: Settlements gain +75% defense - lock down your holdings
- **Delist Train** [E]: +50 Gold income per wonder built - wonders appreciate in value

### Sweeping (Era 3)
The act of buying up entire collections.
- **Buy the Dip** [E]: Enhanced trade income
- **Take Out the Brooms** [W]: Territory-based victory points

### Rugging (Era 3)
The dark side of crypto culture - exploits and exits.
- **Ate on That, Twin** [M]: Gold from pillaging + healing on kills - ruthless efficiency
- **Sends His Regards** [W]: +50 Gold per enemy killed in your territory - home turf advantage

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
```

---

## Balancing Guidelines

- Era 1 cultures: 15-35 Vibes cost
- Era 2 cultures: 45-70 Vibes cost
- Era 3 cultures: 80-120 Vibes cost
- **Era gate**: Each Era N+1 culture requires at least 2 Era N cultures unlocked
- **Military [M]** cards focus on combat, units, defense, healing, and vision
- **Economy [E]** cards focus on gold income, trade routes, and cost discounts
- **Progress [P]** cards focus on Alpha (science) and Vibes (culture) bonuses
- **Wildcard [W]** cards cover production, population, diplomacy, great people, and unique effects
- Cross-tree prerequisites create meaningful decision points
- Each era should have balanced options across all slot types
- Maximum 3 slots per type ensures strategic choices in card selection
