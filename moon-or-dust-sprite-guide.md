# Moon or Dust — Sprite Implementation Guide

## Overview

Strategy game with 4 NFT tribes and 12-15 unit types per tribe. Instead of creating unique sprites for every unit type, we use a **badge + color glow system** that allows one base sprite per tribe to represent all unit types.

---

## Asset Requirements

### Tribe Sprites (from PixelLab)

Generate 8-direction sprites for each tribe:

| Tribe | Status | Files Needed |
|-------|--------|--------------|
| Cets | ✅ Done | north.png, north-east.png, east.png, south-east.png, south.png, south-west.png, west.png, north-west.png |
| Monkes | ✅ Done | Same 8 directions |
| Geckos | ✅ Done | Same 8 directions |
| DeGods | ✅ Done | Same 8 directions |

**Sprite specs:**
- Canvas size: 64×64 pixels
- Actual character: ~24×40 pixels centered
- Format: PNG or WebP with transparency
- Style: Pixel art (PixelLab default style)

**Total tribe sprites needed: 32** (4 tribes × 8 directions)

### Badge Icons (create once, shared across all tribes)

Small icon spritesheet for unit type identification:

| Category | Color | Example Units | Badge Icons Needed |
|----------|-------|---------------|-------------------|
| Military | Red (#ef4444) | Warrior, Archer, Knight, Cavalry | ⚔️ 🏹 🛡️ 🐎 |
| Economy | Yellow (#fbbf24) | Miner, Builder, Trader, Farmer | ⛏️ 🔨 💰 🌾 |
| Recon | Blue (#3b82f6) | Scout, Spy, Explorer | 👁️ 🗺️ 🧭 |
| Special | Purple (#a855f7) | Hero, Shaman, Leader | ⭐ 🔮 👑 |

**Badge specs:**
- Size: 16×16 pixels per icon
- Format: Single spritesheet or individual PNGs
- Style: Simple pixel art icons

**Total badge icons needed: 12-15** (one per unit type)

### Badge Icons Status

| Badge | Unit Type | Status |
|-------|-----------|--------|
| warrior.png | Warrior | ✅ Done |
| swordsman.png | Swordsman | ✅ Done |
| botfighter.png | Bot Fighter | ✅ Done |
| archer.png | Archer | ✅ Done |
| sniper.png | Sniper | ✅ Done |
| rocketeer.png | Rockeeter | ✅ Done |
| horseman.png | Horseman | ✅ Done |
| knight.png | Knight | ✅ Done |
| tank.png | Tank | ✅ Done |
| socialengineer.png | Social Engineer | ✅ Done |
| bombard.png | Bombard | ✅ Done |
| scout.png | Scout | ✅ Done |
| settler.png | Settler | ✅ Done |
| builder.png | Builder | ✅ Done |
| great_person.png | Great Person | ⬜ Todo |
| deadgod.png | DeadGod (tribal) | ⬜ Todo (using swordsman fallback) |
| stuckers.png | Stuckers (tribal) | ⬜ Todo (using swordsman fallback) |
| banana_slinger.png | Banana Slinger (tribal) | ⬜ Todo (using archer fallback) |
| neon_geck.png | Neon Geck (tribal) | ⬜ Todo (using sniper fallback) |

---

## Runtime Implementation (Pixi.js)

### Unit Display Component Structure

```
┌────────────────┐
│            [⚔️]│  ← Badge (16×16) top-right corner
│                │     Border color matches category
│                │
│      🐱        │  ← Tribe sprite (centered)
│     /|\\       │     Swapped based on facing direction
│     / \\       │
│   ══════       │  ← Glow ring (Pixi.Graphics)
└────────────────┘     Color based on unit category
     64×64
```

### Color Coding System

```typescript
const CATEGORY_COLORS = {
  military: {
    primary: '#ef4444',    // Red
    glow: 'rgba(239, 68, 68, 0.6)',
  },
  economy: {
    primary: '#fbbf24',    // Yellow
    glow: 'rgba(251, 191, 36, 0.6)',
  },
  recon: {
    primary: '#3b82f6',    // Blue
    glow: 'rgba(59, 130, 246, 0.6)',
  },
  special: {
    primary: '#a855f7',    // Purple
    glow: 'rgba(168, 85, 247, 0.6)',
  },
};
```

### UnitSprite Class (Pseudocode)

```typescript
class UnitSprite extends PIXI.Container {
  private glowRing: PIXI.Graphics;
  private sprite: PIXI.Sprite;
  private badge: PIXI.Sprite;
  private badgeBorder: PIXI.Graphics;
  
  constructor(tribe: Tribe, unitType: UnitType) {
    // 1. Create glow ring (colored ellipse at bottom)
    this.glowRing = new PIXI.Graphics();
    this.drawGlow(unitType.category);
    
    // 2. Load tribe sprite
    this.sprite = PIXI.Sprite.from(`${tribe}-south.png`);
    this.sprite.anchor.set(0.5, 1); // anchor at bottom center
    
    // 3. Add badge in corner
    this.badge = PIXI.Sprite.from(`badge-${unitType.badge}.png`);
    this.badge.position.set(24, -56); // top-right of 64×64
    
    // 4. Badge border (colored by category)
    this.badgeBorder = new PIXI.Graphics();
    this.drawBadgeBorder(unitType.category);
  }
  
  setDirection(dir: Direction) {
    // Swap sprite texture based on direction
    this.sprite.texture = PIXI.Texture.from(`${this.tribe}-${dir}.png`);
  }
  
  private drawGlow(category: Category) {
    const color = CATEGORY_COLORS[category].primary;
    this.glowRing.clear();
    this.glowRing.beginFill(color, 0.5);
    this.glowRing.drawEllipse(0, 0, 22, 6);
    this.glowRing.endFill();
    this.glowRing.filters = [new PIXI.BlurFilter(2)];
  }
}
```

---

## PixelLab Prompts for Remaining Tribes

### Monkes
```
cute monkey humanoid, purple hair, tan skin, simple round face, 
green and yellow checkered shirt, chibi proportions, 
full body pixel art game sprite, transparent background
```

### Geckos
```
green gecko lizard humanoid, orange spiky mohawk crest on head, 
large yellow eyes with red center, light green belly, 
friendly reptile character, full body pixel art game sprite, 
transparent background
```

### DeGods
```
stone statue humanoid with cracked gray skin, messy dark brown 
spiky hair with small leaves, worn dirty beige tank top, 
muscular build, weathered ancient appearance, 
full body pixel art game sprite, transparent background
```

---

## File Organization

```
/assets
  /sprites
    /tribes
      /cets
        north.png
        north-east.png
        east.png
        south-east.png
        south.png
        south-west.png
        west.png
        north-west.png
      /monkes
        (same 8 files)
      /geckos
        (same 8 files)
      /degods
        (same 8 files)
    /badges
      sword.png      (military - warrior)
      bow.png        (military - archer)
      shield.png     (military - knight)
      pickaxe.png    (economy - miner)
      hammer.png     (economy - builder)
      coin.png       (economy - trader)
      eye.png        (recon - scout)
      compass.png    (recon - explorer)
      star.png       (special - hero)
      crystal.png    (special - shaman)
      ...
```

---

## Summary

| What | Count | Source |
|------|-------|--------|
| Tribe sprites | 32 total | PixelLab (8 directions × 4 tribes) |
| Badge icons | 12-15 | PixelLab or manual pixel art |
| Glow effect | 0 assets | Pixi.js Graphics (runtime) |
| Badge border | 0 assets | Pixi.js Graphics (runtime) |

**Benefits of this approach:**
- Only 32 character sprites instead of 384-480
- Easy to add new unit types (just add a badge)
- Category recognition at a glance via color
- Specific unit identification via badge
- Performant on mobile

---

## Implementation Status

### Completed ✅
- [x] Tribe sprites loaded and displayed (all 4 tribes, 8 directions each)
- [x] Sprite preloading system
- [x] 8-direction rotation based on unit movement
- [x] Hover rotation (unit faces direction you're hovering)
- [x] Category glow ellipse under each unit
- [x] Badge icons loaded and displayed
- [x] Badge positioned in upper-right corner
- [x] Badge tinted by unit rarity (common=white, uncommon=green, rare=blue, epic=purple, legendary=gold)
- [x] Path arrow overlay when hovering reachable hexes
- [x] Unit stacking with proper spacing
- [x] Health bar display

### Remaining ⬜
- [ ] Unique badges for tribal units (deadgod, stuckers, banana_slinger, neon_geck)
- [ ] Great person badge
- [ ] Badge border/background for better visibility (optional)
- [ ] Movement animation (optional)
