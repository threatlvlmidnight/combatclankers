# Weapons Overhaul & Custom Bot Builder — Design Doc

## Goal
Rework spinner physics to be authentic, add two new weapon types (Flipper, Crusher), and replace the static Garage viewer with a full 3-slot loadout builder that saves custom bots to localStorage.

## Visual Style
Old-school comic/brawler aesthetic throughout — impact text popups (FWOOSH!, CRUNCH!, CLAMP!), high-contrast color fills, status labels on bots.

---

## Part 1: Spinner Rework

### Spin Energy System
Spinners gain a `spinEnergy` value (0–100) that charges while active. Energy resets to 0 on any collision hit.

| Spinner Type | Spin-Up Time (0→100%) |
|---|---|
| Drum Spinner (VORTEX) | 5 seconds |
| Future horizontal spinner | 8 seconds |
| Future vertical spinner | 4 seconds |

### Collision Behavior
When a spinning bot collides with an opponent:
- `damage = baseDamage × (spinEnergy / 100) × spinnerMultiplier`
- `knockbackImpulse = baseKnockback × (spinEnergy / 100)` — applied to opponent in direction away from spinner
- Spinner self-damage: `damage × 0.10` (spinner takes recoil)
- Spinner self-knockback: small impulse opposite to impact direction
- `spinEnergy` resets to 0 after hit (weapon stopped by impact)

### Movement Debuff While Spinning
- **Horizontal spinner:** continuous sideways drift perpendicular to facing, magnitude = `driftForce × (spinEnergy / 100)`. Direction based on spin direction.
- **Vertical spinner:** bot speed multiplied by `0.65` at full charge, scaling linearly from 1.0 at 0%.

### Visuals
- Ring radius and brightness scale with `spinEnergy` (dim/small at 0%, full glow and size at 100%)
- Status label: `SPIN: 0%` → `SPIN: 75%` → `SPIN: 100% ★`
- On hit: ring flashes white, blades disappear briefly (weapon stopped)

### GameConfig additions
```javascript
spinners: {
  drumSpinUpMs: 5000,
  driftForce: 40,
  verticalSpeedFactor: 0.65,
  selfDamageRatio: 0.10,
  knockbackBase: 300
}
```

---

## Part 2: FlipperBot — "CATAPULT"

### Hydraulic Charge System
- `flipCharge`: 0–100, starts at 100 (full)
- Q fires regardless of charge level — fires at proportional power
- After firing: `flipCharge = 0`, refills over 6 seconds
- Status bar: `▓▓▓▓▓ READY` → `░░░░░ RECHARGING` (5 segments, fills left to right)

### Flip Mechanics
- Arm snaps forward in 120ms animation (visual only, no tween — manual delta like hammer)
- On fire: check if opponent is within 60px of front arc
- If hit: apply velocity impulse `flipForce × (flipCharge / 100)` to opponent, directed away from flipper's facing
- Direct flip damage: `flipDamage × (flipCharge / 100)` HP
- **Wall slam detection:** for 800ms after a flip, track if opponent's speed drops suddenly (wall impact). If so: bonus `wallSlamDamage × impactSpeed / 400` HP damage

### Comic Flair
- Full-charge flip: `FWOOSH!` text popup (orange, large, fades in 600ms) at impact point
- Wall slam: `CRUNCH!` text popup (red, at wall impact point)
- Partial flip (<50% charge): `thwp!` text (smaller, grey)

### Visuals
- Chrome scoop arm at bot front, rotates ~70° on fire
- Arm glows orange when charge is 100%
- Charge bar below bot (5 segments, yellow→grey as depleted)

### GameConfig additions
```javascript
flipper: {
  flipForce: 600,
  flipDamage: 15,
  wallSlamDamage: 40,
  rechargeMs: 6000,
  armSwingMs: 120,
  rangeCheck: 60
}
```

---

## Part 3: CrusherBot — "IRONJAW"

### Grab & Steer Mechanics
- Q attempts grab if opponent within 55px of front
- On grab: `isGrabbed = true` on opponent bot; each frame opponent's position/velocity is locked to match crusher's front offset
- While grabbed: `crushDamage` (8 HP/sec) applied continuously
- Q again: releases. Auto-release after 3000ms. 2s cooldown after release before next grab.
- **Wall slam:** while grabbing, if crusher drives opponent into a wall (opponent position hits arena bounds), apply `wallSlamDamage` to opponent + `SLAM!` popup

### Comic Flair
- On grab: `CLAMP!` text popup (yellow) at grab point
- Wall slam: `SLAM!` text popup (red, bold)
- Release: `CREAK` small text (grey)

### Visuals
- Two claw arms on bot front (drawn with graphics)
- **Open** (default): arms spread ~45° apart
- **Approaching** (<80px from enemy): arms close to 20° apart
- **Locked**: arms fully shut, pulsing red tint

### GameConfig additions
```javascript
crusher: {
  grabRange: 55,
  crushDps: 8,
  wallSlamDamage: 35,
  maxGrabMs: 3000,
  grabCooldownMs: 2000
}
```

---

## Part 4: Custom Bot Builder (GarageScene Overhaul)

### Architecture
- New `CustomBot` class (`bots/CustomBot.js`) — accepts `{ name, color, chassis, armor, weapon }` config, renders appropriate weapon graphics, delegates `updateWeapon` to the correct weapon module
- Weapon modules live in `bots/weapons/` — each exports `update(bot, keys, delta, enemy)` and `drawGfx(bot)` and a network state helper
- Existing preset bots (WedgeBot1, WedgeBot2, SpinnerBot, HammerBot, FlipperBot, CrusherBot) stay in `BOT_ROSTER` unchanged
- Custom bots stored in `localStorage` as JSON, loaded into a separate `CUSTOM_BOTS` array at startup
- `BotSelectScene` renders presets first, then custom bots, all in the same horizontal scroll

### Chassis Options

| Chassis | Speed | Rotation | HP Modifier | Description |
|---|---|---|---|---|
| 2-WHEEL | 260 | 85 | ×0.85 | Fastest, weak turning |
| 4-WHEEL | 200 | 130 | ×1.0 | Balanced |
| 8-WHEEL | 140 | 175 | ×1.2 | Slowest, iron-grip turning, bonus HP |

### Armor Options

| Armor | Speed Factor | HP Factor | Damage Reduction |
|---|---|---|---|
| LIGHT | ×1.25 | ×0.70 | 0% |
| MEDIUM | ×1.0 | ×1.0 | 20% |
| HEAVY | ×0.60 | ×1.40 | 35% |

Heavy armor is punishingly slow — even a 2-wheel chassis with heavy armor crawls.

### Weapon Options (picker cards)
Wedge · Hammer · Drum Spinner · Flipper · Crusher

Each card shows: weapon name, icon (drawn with graphics), brief description, and a Weapon Power stat bar.

### Stat Formula
```
finalSpeed    = chassis.speed × armor.speedFactor
finalHP       = chassis.baseHP × armor.hpFactor   (baseHP: 2-wheel=220, 4-wheel=280, 8-wheel=340)
damageReduce  = armor.dr
rotationSpeed = chassis.rotation
weaponPower   = weapon.powerRating (20–90)
```

### Builder UI Flow (all inside GarageScene)
1. **Name field** — Phaser DOM input element, 12-char max, monospace style
2. **Chassis row** — 3 cards (170×130px each), highlight selected
3. **Armor row** — 3 cards, same pattern
4. **Weapon row** — horizontal scroll (same pattern as BotSelect), 5+ weapon cards
5. **Color swatches** — 16 color circles (2 rows of 8), picks `primaryColor`
6. **Live stat preview** — right panel: Speed / Armor / Weapon Power bars, updates instantly on any change
7. **BUILD IT** button — validates (name required), saves to localStorage, transitions to BotSelectScene

### LocalStorage Format
```json
{
  "customBots": [
    {
      "key": "custom_1741441200000",
      "name": "SHREDDER",
      "color": 16711680,
      "chassis": "4wheel",
      "armor": "medium",
      "weapon": "spinner"
    }
  ]
}
```

### BotSelectScene changes
- On `create()`, load `CUSTOM_BOTS` from localStorage and append to displayed cards
- Each custom bot card shows its computed stats (from chassis+armor combo)
- Cards for custom bots have a small `[CUSTOM]` badge
- Horizontal scroll already handles overflow — no changes to scroll logic needed

---

## Files to Create / Modify

| File | Action |
|---|---|
| `bots/SpinnerBot.js` | Modify — add `spinEnergy`, rework collision handling, movement debuff |
| `bots/FlipperBot.js` | Create |
| `bots/CrusherBot.js` | Create |
| `bots/CustomBot.js` | Create |
| `scenes/GarageScene.js` | Rewrite — full bot builder UI |
| `scenes/BattleScene.js` | Modify — spinner knockback impulse, wall-slam detection, crusher grab sync |
| `scenes/BotSelectScene.js` | Modify — load and display custom bots from localStorage |
| `data/GameConfig.js` | Modify — add `spinners`, `flipper`, `crusher` config blocks |
| `data/BotRoster.js` | Modify — add FlipperBot and CrusherBot entries |
| `index.html` | Modify — add script tags for new bot files |

---

## Roadmap (out of scope for this plan)
- Supabase login system (username/password, match history, level, bots)
- Vertical spinner variant bot
- Horizontal full-body spinner bot (Tombstone-style)
- AI for new weapon types (FlipperBot AI, CrusherBot AI)
