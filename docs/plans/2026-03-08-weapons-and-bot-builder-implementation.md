# Weapons Overhaul & Custom Bot Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework spinner physics to use authentic spin-energy mechanics, add FlipperBot and CrusherBot with comic-style impact text, and replace the static Garage with a full 3-slot loadout builder that saves custom bots to localStorage.

**Architecture:** All bot classes remain standalone vanilla JS files loaded via `<script>` tags. A new `CustomBot` class handles any chassis+armor+weapon combo at runtime. Custom bots persist to `localStorage` and are appended to `CUSTOM_ROSTER` (global array), which `BotSelectScene` and `BattleScene` check alongside `BOT_ROSTER`. No build tools, no modules — plain global JS.

**Tech Stack:** Phaser 3.60, vanilla JS, localStorage, PeerJS (existing multiplayer unchanged except new weapon state fields in `_sendState`/`_applyWeaponState`)

**Canvas:** 900×650px. Arena inner bounds: x=57, y=100, x2=843, y2=586.

---

### Task 1: GameConfig additions

**Files:**
- Modify: `data/GameConfig.js`

**Step 1: Add spinner, flipper, crusher config blocks**

Open `data/GameConfig.js` and add after the existing `drive` block:

```javascript
  // ── Spinners ────────────────────────────────────────────────────────────────
  spinners: {
    drumSpinUpMs:      5000,   // time from 0% to 100% for drum spinner
    driftForce:        40,     // sideways drift force on horizontal spinner at full charge
    verticalSpeedFactor: 0.65, // speed multiplier for vertical spinner at full charge
    selfDamageRatio:   0.10,   // fraction of dealt damage reflected back to spinner
    knockbackBase:     320     // max velocity impulse applied to opponent on hit
  },

  // ── Flipper ─────────────────────────────────────────────────────────────────
  flipper: {
    flipForce:     600,   // velocity impulse at full charge
    flipDamage:    15,    // HP damage at full charge
    wallSlamDamage: 45,   // bonus damage when launched bot hits a wall
    rechargeMs:    6000,  // full recharge time
    armSwingMs:    120,   // arm forward stroke duration
    rangeCheck:    62     // max distance to flip target
  },

  // ── Crusher ─────────────────────────────────────────────────────────────────
  crusher: {
    grabRange:       55,   // max distance to initiate grab
    crushDps:        8,    // HP per second while grabbed
    wallSlamDamage:  38,   // bonus HP when grabbed bot is driven into a wall
    maxGrabMs:       3000, // auto-release after this long
    grabCooldownMs:  2000  // cooldown between grabs
  }
```

**Step 2: Verify**

Open `index.html` in a browser. Open the console and type `GAME_CONFIG.spinners`. Should print the object. No errors.

**Step 3: Commit**

```bash
git add data/GameConfig.js
git commit -m "feat: add spinner, flipper, crusher config blocks"
```

---

### Task 2: SpinnerBot rework — spin energy system

**Files:**
- Modify: `bots/SpinnerBot.js`

**Context:** Currently SpinnerBot has `spinnerActive` (bool) and `spinnerAngle` (rotation counter). The rework adds `spinEnergy` (0–100 number) that charges over `drumSpinUpMs` while active and resets to 0 on any hit. Visual ring scales with energy. Status label shows percentage.

**Step 1: Add `spinEnergy` to constructor**

In the constructor, after `this._jWasDown = false;`, add:

```javascript
    this.spinEnergy = 0;   // 0-100, charges up while spinning
```

**Step 2: Rework `updateWeapon` to charge spinEnergy**

Replace the `updateWeapon` method:

```javascript
  updateWeapon(keys, delta) {
    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown) {
      this.spinnerActive = !this.spinnerActive;
      if (!this.spinnerActive) this.spinEnergy = 0; // reset on manual stop
      if (this._statusLabel) {
        this._statusLabel.setColor(this.spinnerActive ? '#44ff88' : '#226633');
      }
    }
    this._jWasDown = jDown;

    if (this.spinnerActive) {
      // Charge up
      const chargeRate = 100 / GAME_CONFIG.spinners.drumSpinUpMs;
      this.spinEnergy = Math.min(100, this.spinEnergy + delta * chargeRate);
      this.spinnerAngle += delta * 0.014;

      // Horizontal spinner drift — push perpendicular to facing
      const perpAngle = this.rotation + Math.PI / 2;
      const drift = GAME_CONFIG.spinners.driftForce * (this.spinEnergy / 100);
      this.body.velocity.x += Math.cos(perpAngle) * drift * (delta / 1000) * 60;
      this.body.velocity.y += Math.sin(perpAngle) * drift * (delta / 1000) * 60;
    }

    if (this._statusLabel) {
      if (this.spinnerActive) {
        const pct = Math.floor(this.spinEnergy);
        const star = pct >= 100 ? ' ★' : '';
        this._statusLabel.setText(`SPIN: ${pct}%${star}`);
      } else {
        this._statusLabel.setText('SPIN: OFF');
      }
    }

    this._updateSpinnerGfx();
  }
```

**Step 3: Scale ring visuals with spinEnergy in `_updateSpinnerGfx`**

Replace the ring drawing section inside `_updateSpinnerGfx`:

```javascript
  _updateSpinnerGfx() {
    const drumX = this.x + Math.cos(this.rotation) * 20;
    const drumY = this.y + Math.sin(this.rotation) * 20;
    const energyRatio = this.spinEnergy / 100;

    this._ringGfx.clear();
    if (this.spinnerActive) {
      const pulse = 0.6 + 0.4 * Math.sin(this.spinnerAngle * 3);
      const brightness = 0.4 + 0.6 * energyRatio;
      const radius = 14 + 8 * energyRatio;  // 14px idle → 22px full
      this._ringGfx.lineStyle(2 + Math.round(energyRatio * 2), 0x44ffaa, pulse * brightness);
      this._ringGfx.strokeCircle(drumX, drumY, radius);
      // Inner glow at high energy
      if (energyRatio > 0.7) {
        this._ringGfx.lineStyle(1, 0xffffff, (energyRatio - 0.7) * 2);
        this._ringGfx.strokeCircle(drumX, drumY, radius - 4);
      }
    } else {
      this._ringGfx.lineStyle(1, 0x226633, 0.4);
      this._ringGfx.strokeCircle(drumX, drumY, 14);
    }

    if (this.spinnerActive) {
      this._drawBlades(drumX, drumY);
    } else {
      this._spinGfx.clear();
    }
  }
```

**Step 4: Override `takeDamage` to reset spinEnergy on hit**

Add this method to SpinnerBot (before `preUpdate`):

```javascript
  takeDamage(amount, zone) {
    const result = super.takeDamage(amount, zone);
    if (amount > 0) {
      this.spinEnergy = 0;
      this.spinnerActive = false;
      if (this._statusLabel) {
        this._statusLabel.setText('SPIN: OFF').setColor('#226633');
      }
    }
    return result;
  }
```

**Step 5: Verify**

Open game, pick VORTEX vs anything in solo. Press Q — status label should count up `SPIN: 0%` → `SPIN: 100% ★` over 5 seconds. Bot should drift sideways. Pressing Q again resets to OFF. Getting hit resets to 0%.

**Step 6: Commit**

```bash
git add bots/SpinnerBot.js
git commit -m "feat: spinner spin-energy system with charge, drift, and reset on hit"
```

---

### Task 3: BattleScene — impact text system + spinner collision physics

**Files:**
- Modify: `scenes/BattleScene.js`

**Context:** Adding a shared `showImpactText(x, y, text, color)` method used by flipper and crusher. Also reworking `handleBotCollision` so spinner damage/knockback scales with `spinEnergy`.

**Step 1: Add `showImpactText` method**

Add this method to BattleScene (before `update`):

```javascript
  showImpactText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontSize: '22px', color, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 650,
      ease: 'Power2',
      onComplete: () => t.destroy()
    });
  }
```

**Step 2: Rework `handleBotCollision` for spinner energy scaling + knockback**

Replace the spinner multiplier section in `handleBotCollision`:

```javascript
  handleBotCollision(bot1, bot2) {
    if (this.gameOver) return;
    if (this.isOnline && !this.isHost) return;
    const dvx = bot1.body.velocity.x - bot2.body.velocity.x;
    const dvy = bot1.body.velocity.y - bot2.body.velocity.y;
    const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
    if (relSpeed < GAME_CONFIG.collision.minRelSpeed) return;

    const baseDamage = relSpeed * GAME_CONFIG.collision.damageMultiplier;
    const zone1 = this.getHitZone(bot2, bot1);
    const zone2 = this.getHitZone(bot1, bot2);

    // Spinner: energy-scaled damage + knockback + self-damage
    const applySpinner = (spinner, victim, victimZone) => {
      if (!spinner.spinnerActive || spinner.spinEnergy <= 0) return 1.0;
      const ratio = spinner.spinEnergy / 100;
      const mult = GAME_CONFIG.weapons.spinnerMultiplier * ratio;

      // Knockback impulse on victim
      const kb = GAME_CONFIG.spinners.knockbackBase * ratio;
      const angle = Math.atan2(victim.y - spinner.y, victim.x - spinner.x);
      victim.body.setVelocity(Math.cos(angle) * kb, Math.sin(angle) * kb);

      // Self-damage + recoil on spinner (energy already resets via takeDamage override)
      const selfDmg = baseDamage * mult * GAME_CONFIG.spinners.selfDamageRatio;
      super_takeDamage_bypass(spinner, selfDmg); // see note below
      spinner.body.setVelocity(Math.cos(angle + Math.PI) * kb * 0.3, Math.sin(angle + Math.PI) * kb * 0.3);

      // Impact text
      if (ratio > 0.5) {
        this.showImpactText(victim.x, victim.y - 30, ratio >= 0.9 ? 'KAPOW!' : 'WHAM!', '#ffcc00');
      }

      return mult;
    };

    // NOTE: to self-damage the spinner without triggering its takeDamage override
    // (which would reset spinEnergy before the hit is registered), call Bot's takeDamage directly:
    const super_takeDamage_bypass = (bot, amount) => Bot.prototype.takeDamage.call(bot, amount, 'side');

    const mult1 = applySpinner(bot2, bot1, zone1); // bot2 is spinner hitting bot1
    const mult2 = applySpinner(bot1, bot2, zone2); // bot1 is spinner hitting bot2

    bot1.takeDamage(baseDamage * (bot2.spinnerActive ? mult1 : 1.0), zone1);
    bot2.takeDamage(baseDamage * (bot1.spinnerActive ? mult2 : 1.0), zone2);

    if (bot1.hp <= 0) this.knockOut(bot1, 'disable');
    else if (bot2.hp <= 0) this.knockOut(bot2, 'disable');
  }
```

**Step 3: Update `_sendState` to include `spinEnergy`**

In `_sendState`, add `sen` to both the `p` and `a` objects:

```javascript
        sa: p.spinnerActive || false, sang: p.spinnerAngle || 0, sen: p.spinEnergy || 0,
```
```javascript
        sa: a.spinnerActive || false, sang: a.spinnerAngle || 0, sen: a.spinEnergy || 0,
```

**Step 4: Update `_applyWeaponState` to sync `spinEnergy`**

In `_applyWeaponState`, in the `spinnerActive !== undefined` branch, add after `bot.spinnerAngle = d.sang;`:

```javascript
      bot.spinEnergy = d.sen ?? 0;
```

And update the status label sync in that same branch:

```javascript
      if (wasActive !== d.sa && bot._statusLabel) {
        bot._statusLabel.setColor(d.sa ? '#44ff88' : '#226633');
      }
      if (bot._statusLabel && d.sa) {
        const pct = Math.floor(d.sen || 0);
        bot._statusLabel.setText(`SPIN: ${pct}%${pct >= 100 ? ' ★' : ''}`);
      } else if (bot._statusLabel && !d.sa) {
        bot._statusLabel.setText('SPIN: OFF');
      }
```

**Step 5: Verify**

Solo match: VORTEX vs CRUSHER. Spin up to 100%, ram into CRUSHER — it should fly back hard. CRUSHER rams VORTEX (not spun) — normal low damage, no big knockback.

**Step 6: Commit**

```bash
git add scenes/BattleScene.js
git commit -m "feat: spinner energy-scaled collision, knockback impulse, impact text system"
```

---

### Task 4: FlipperBot

**Files:**
- Create: `bots/FlipperBot.js`

**Context:** FlipperBot has a hydraulic charge (0–100), fires a scoop arm on Q, launches opponent with proportional force, and tracks wall proximity after a flip to deal wall-slam bonus damage. Uses `BattleScene.showImpactText` for comic flair.

**Step 1: Create `bots/FlipperBot.js`**

```javascript
class FlipperBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('flipperbot')) {
      FlipperBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'flipperbot',
      color: 0x1155cc,
      hp: 300,
      driveHP: 55,
      weaponHP: 60,
      speed: 195,
      rotationSpeed: 125
    });

    this.flipCharge = 100;
    this._flipArmAngle = 0;   // 0 = resting, up to 1.2 = fully extended
    this._armFiring = false;
    this._armReturnDelay = 0;
    this._jWasDown = false;
    this._wallCheckTimer = 0;
    this._flippedEnemy = null;
    this._wallSlamDealt = false;

    this._flipGfx = scene.add.graphics().setDepth(4);
    this._chargeBar = scene.add.graphics().setDepth(5);

    this._statusLabel = scene.add.text(x, y + 38, '▓▓▓▓▓ READY', {
      fontSize: '9px', color: '#4488ff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'CATAPULT', {
      fontSize: '11px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    this._updateFlipperGfx();
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x1155cc, 1);
    g.fillRect(0, 0, w, h);
    // Chrome scoop base at front
    g.fillStyle(0x88aadd, 1);
    g.fillRect(w - 18, 6, 18, h - 12);
    // Tracks
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 20, 8);
    g.fillRect(2, h - 9, w - 20, 8);
    g.fillStyle(0x333333, 1);
    for (let i = 4; i < w - 22; i += 9) {
      g.fillRect(i, 2, 5, 6);
      g.fillRect(i, h - 8, 5, 6);
    }
    g.generateTexture('flipperbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta, enemy) {
    const cfg = GAME_CONFIG.flipper;

    // Recharge
    if (this.flipCharge < 100) {
      this.flipCharge = Math.min(100, this.flipCharge + (delta / cfg.rechargeMs) * 100);
    }

    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown && !this._armFiring) {
      this._fire(enemy);
    }
    this._jWasDown = jDown;

    // Arm animation — forward stroke
    if (this._armFiring) {
      this._flipArmAngle += delta / cfg.armSwingMs * 1.2;
      if (this._flipArmAngle >= 1.2) {
        this._flipArmAngle = 1.2;
        this._armFiring = false;
        this._armReturnDelay = 200;
      }
    }
    // Arm return after delay
    if (!this._armFiring && this._armReturnDelay > 0) {
      this._armReturnDelay -= delta;
      if (this._armReturnDelay <= 0) {
        this._flipArmAngle = 0;
      }
    }

    // Wall slam detection for 800ms after flip
    if (this._wallCheckTimer > 0) {
      this._wallCheckTimer -= delta;
      if (this._flippedEnemy?.active && !this._wallSlamDealt) {
        const e = this._flippedEnemy;
        const nearWall = e.x < 82 || e.x > 818 || e.y < 125 || e.y > 561;
        if (nearWall) {
          this._wallSlamDealt = true;
          e.takeDamage(cfg.wallSlamDamage, 'side');
          if (this.scene.showImpactText) {
            this.scene.showImpactText(e.x, e.y - 20, 'CRUNCH!', '#ff3333');
          }
        }
      }
    }

    this._updateStatusLabel();
    this._updateFlipperGfx();
  }

  _fire(enemy) {
    const cfg = GAME_CONFIG.flipper;
    const chargeRatio = this.flipCharge / 100;
    this._armFiring = true;
    this._wallSlamDealt = false;
    this.flipCharge = 0;

    if (enemy?.active) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < cfg.rangeCheck) {
        const force = cfg.flipForce * chargeRatio;
        const angle = this.rotation;
        enemy.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
        enemy.takeDamage(cfg.flipDamage * chargeRatio, 'side');
        this._flippedEnemy = enemy;
        this._wallCheckTimer = 800;

        if (this.scene.showImpactText) {
          if (chargeRatio >= 0.85) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'FWOOSH!', '#ff8800');
            this.scene.cameras.main.shake(80, 0.007);
          } else if (chargeRatio >= 0.4) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'WHOMP!', '#886600');
          } else {
            this.scene.showImpactText(enemy.x, enemy.y - 14, 'thwp!', '#666666');
          }
        }
      }
    }
  }

  _updateStatusLabel() {
    if (!this._statusLabel) return;
    const segs = Math.round(this.flipCharge / 20); // 0-5 segments
    const bar = '▓'.repeat(segs) + '░'.repeat(5 - segs);
    if (this.flipCharge >= 100) {
      this._statusLabel.setText(`${bar} READY`).setColor('#4488ff');
    } else {
      this._statusLabel.setText(`${bar} ${Math.floor(this.flipCharge)}%`).setColor('#224466');
    }
  }

  _updateFlipperGfx() {
    const g = this._flipGfx;
    g.clear();

    // Scoop arm — rotates up from front of bot
    const frontX = this.x + Math.cos(this.rotation) * 28;
    const frontY = this.y + Math.sin(this.rotation) * 28;
    const armAngle = this.rotation - this._flipArmAngle; // rotates upward
    const armLen = 20;
    const armW = 7;

    const px = Math.cos(armAngle + Math.PI / 2) * armW;
    const py = Math.sin(armAngle + Math.PI / 2) * armW;
    const ex = Math.cos(armAngle) * armLen;
    const ey = Math.sin(armAngle) * armLen;

    // Arm color: orange-white at full charge
    const chargeRatio = this.flipCharge / 100;
    const armColor = chargeRatio >= 1.0 ? 0xffa040 : 0x6688cc;
    g.fillStyle(armColor, 1);
    g.fillTriangle(
      frontX - px, frontY - py,
      frontX + px, frontY + py,
      frontX + ex + px, frontY + ey + py
    );
    g.fillTriangle(
      frontX - px, frontY - py,
      frontX + ex + px, frontY + ey + py,
      frontX + ex - px, frontY + ey - py
    );

    // Scoop tip
    g.fillStyle(0xaaccff, 1);
    g.fillCircle(frontX + ex, frontY + ey, 5);

    g.setPosition(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    if (!this._armFiring) this._updateFlipperGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._flipGfx) this._flipGfx.destroy();
    if (this._chargeBar) this._chargeBar.destroy();
    super.destroy(fromScene);
  }
}
```

**Step 2: Add flipper network state to BattleScene**

In `_sendState`, add to both `p` and `a` objects:
```javascript
        fc: p.flipCharge ?? 100, fa: p._flipArmAngle || 0,
```
```javascript
        fc: a.flipCharge ?? 100, fa: a._flipArmAngle || 0,
```

In `_applyWeaponState`, add a new branch for flipper bots (after the hammerAngle branch):
```javascript
    if (bot.flipCharge !== undefined) {
      bot.flipCharge = d.fc ?? 100;
      bot._flipArmAngle = d.fa || 0;
      bot._updateFlipperGfx?.();
      bot._updateStatusLabel?.();
    }
```

**Step 3: Verify**

Pick CATAPULT in bot select (once added to roster in Task 7). Press Q at full charge near opponent — FWOOSH!, opponent flies. Wait for recharge bar to refill. Slam opponent into wall — CRUNCH!

**Step 4: Commit**

```bash
git add bots/FlipperBot.js scenes/BattleScene.js
git commit -m "feat: FlipperBot with hydraulic charge, wall slam detection, comic text"
```

---

### Task 5: CrusherBot

**Files:**
- Create: `bots/CrusherBot.js`
- Modify: `scenes/BattleScene.js` (grab physics + multiplayer sync)

**Context:** CrusherBot grabs opponents on Q (if in range), locks their position to the crusher's front, deals sustained damage, and deals wall slam damage when driven into arena walls. Grab lasts max 3 seconds or until released.

**Step 1: Create `bots/CrusherBot.js`**

```javascript
class CrusherBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('crusherbot')) {
      CrusherBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'crusherbot',
      color: 0x882200,
      hp: 340,
      driveHP: 65,
      weaponHP: 60,
      speed: 160,
      rotationSpeed: 110
    });

    this.crushGrabActive = false;
    this._grabTimer = 0;
    this._grabCooldown = 0;
    this._jWasDown = false;
    this._clawAngle = 0.5;  // 0 = closed, 0.5 = open (radians each claw)
    this._wallSlamCooldown = 0;  // prevent repeated wall slam hits

    this._clawGfx = scene.add.graphics().setDepth(4);

    this._statusLabel = scene.add.text(x, y + 38, 'JAWS: OPEN', {
      fontSize: '9px', color: '#884422', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'IRONJAW', {
      fontSize: '11px', color: '#cc4422', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    this._updateClawGfx();
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x882200, 1);
    g.fillRect(0, 0, w, h);
    // Heavy armor plates
    g.fillStyle(0xaa3311, 1);
    g.fillRect(w - 20, 2, 20, h - 4);
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 22, 9);
    g.fillRect(2, h - 10, w - 22, 9);
    g.fillStyle(0x444444, 1);
    for (let i = 4; i < w - 24; i += 9) {
      g.fillRect(i, 2, 5, 7);
      g.fillRect(i, h - 9, 5, 7);
    }
    // Reinforced center
    g.fillStyle(0x661100, 1);
    g.fillRect(10, 14, 28, h - 28);
    g.generateTexture('crusherbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta, enemy) {
    const cfg = GAME_CONFIG.crusher;

    if (this._grabCooldown > 0) this._grabCooldown -= delta;
    if (this._wallSlamCooldown > 0) this._wallSlamCooldown -= delta;

    const jDown = keys.primaryFire.isDown;

    if (this.crushGrabActive) {
      // Auto-release
      this._grabTimer += delta;
      if (this._grabTimer >= cfg.maxGrabMs) {
        this._release(enemy);
      } else if (jDown && !this._jWasDown) {
        this._release(enemy);
      } else if (enemy?.active) {
        // Lock enemy to front of crusher
        const grabDist = 32;
        enemy.x = this.x + Math.cos(this.rotation) * grabDist;
        enemy.y = this.y + Math.sin(this.rotation) * grabDist;
        if (enemy.body) enemy.body.setVelocity(0, 0);

        // Sustained crush damage
        enemy.takeDamage((cfg.crushDps / 1000) * delta, 'side');

        // Wall slam detection — if we drive them into walls
        if (this._wallSlamCooldown <= 0) {
          const nearWall = enemy.x < 82 || enemy.x > 818 || enemy.y < 125 || enemy.y > 561;
          if (nearWall) {
            this._wallSlamCooldown = 800; // prevent rapid hits
            enemy.takeDamage(cfg.wallSlamDamage, 'side');
            if (this.scene.showImpactText) {
              this.scene.showImpactText(enemy.x, enemy.y - 20, 'SLAM!', '#ff2200');
              this.scene.cameras.main.shake(120, 0.008);
            }
          }
        }
      } else {
        this._release(null);
      }
    } else if (jDown && !this._jWasDown && this._grabCooldown <= 0) {
      // Attempt grab
      if (enemy?.active) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist < cfg.grabRange) {
          this.crushGrabActive = true;
          this._grabTimer = 0;
          if (this._statusLabel) this._statusLabel.setText('JAWS: LOCKED!').setColor('#ff4422');
          if (this.scene.showImpactText) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'CLAMP!', '#ffaa00');
          }
        }
      }
    }

    this._jWasDown = jDown;

    // Animate claw angle
    const targetAngle = this.crushGrabActive ? 0.05 : (enemy?.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) < 80 ? 0.25 : 0.5);
    const clawSpeed = 0.005 * delta;
    if (Math.abs(this._clawAngle - targetAngle) < clawSpeed) {
      this._clawAngle = targetAngle;
    } else {
      this._clawAngle += (targetAngle > this._clawAngle ? 1 : -1) * clawSpeed;
    }

    this._updateClawGfx();
  }

  _release(enemy) {
    this.crushGrabActive = false;
    this._grabCooldown = GAME_CONFIG.crusher.grabCooldownMs;
    if (this._statusLabel) this._statusLabel.setText('JAWS: OPEN').setColor('#884422');
    if (this.scene.showImpactText && enemy?.active) {
      this.scene.showImpactText(enemy.x, enemy.y - 14, 'creak', '#554433');
    }
  }

  _updateClawGfx() {
    const g = this._clawGfx;
    g.clear();

    const frontX = this.x + Math.cos(this.rotation) * 26;
    const frontY = this.y + Math.sin(this.rotation) * 26;
    const clawLen = 18;

    const drawClaw = (sign) => {
      const baseAngle = this.rotation + sign * (Math.PI / 4 + this._clawAngle);
      const tipAngle = baseAngle + sign * 0.3;

      const bx = Math.cos(this.rotation + sign * 0.22) * 10;
      const by = Math.sin(this.rotation + sign * 0.22) * 10;

      const color = this.crushGrabActive ? 0xff4422 : 0xaa4422;
      g.lineStyle(4, color, 1);
      g.beginPath();
      g.moveTo(frontX + bx, frontY + by);
      g.lineTo(frontX + bx + Math.cos(baseAngle) * clawLen, frontY + by + Math.sin(baseAngle) * clawLen);
      g.strokePath();

      // Claw tip curve
      g.lineStyle(3, 0xcc6644, 1);
      g.beginPath();
      g.moveTo(frontX + bx + Math.cos(baseAngle) * clawLen, frontY + by + Math.sin(baseAngle) * clawLen);
      g.lineTo(frontX + bx + Math.cos(tipAngle) * (clawLen + 6), frontY + by + Math.sin(tipAngle) * (clawLen + 6));
      g.strokePath();
    };

    drawClaw(1);
    drawClaw(-1);

    // Pulse red glow when locked
    if (this.crushGrabActive) {
      g.lineStyle(2, 0xff2200, 0.4 + 0.4 * Math.sin(Date.now() / 150));
      g.strokeCircle(frontX, frontY, 12);
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    if (!this.crushGrabActive) this._updateClawGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._clawGfx) this._clawGfx.destroy();
    super.destroy(fromScene);
  }
}
```

**Step 2: Guard crusher grab in BattleScene for online play**

In `BattleScene._applyClientInput`, the host already calls `bot.updateWeapon(...)` on the aiBot, which handles grab logic. That's correct — host owns grab physics.

Add crusher network state to `_sendState` (both `p` and `a`):
```javascript
        cg: p.crushGrabActive || false,
```
```javascript
        cg: a.crushGrabActive || false,
```

Add to `_applyWeaponState` (new branch):
```javascript
    if (bot.crushGrabActive !== undefined) {
      const wasGrabbed = bot.crushGrabActive;
      bot.crushGrabActive = d.cg;
      bot._clawAngle = d.cg ? 0.05 : (bot._clawAngle ?? 0.5);
      if (wasGrabbed !== d.cg && bot._statusLabel) {
        bot._statusLabel.setText(d.cg ? 'JAWS: LOCKED!' : 'JAWS: OPEN');
        bot._statusLabel.setColor(d.cg ? '#ff4422' : '#884422');
      }
      bot._updateClawGfx?.();
    }
```

**Step 3: Verify**

Pick IRONJAW vs any bot. Drive up close, press Q — CLAMP! text, claws snap shut. Drive into wall with opponent locked — SLAM! and damage. Press Q again or wait 3 seconds — claws open, creak text.

**Step 4: Commit**

```bash
git add bots/CrusherBot.js scenes/BattleScene.js
git commit -m "feat: CrusherBot grab-and-steer with wall slam, clamp visual, multiplayer sync"
```

---

### Task 6: BotRoster + index.html updates

**Files:**
- Modify: `data/BotRoster.js`
- Modify: `index.html`

**Step 1: Add FlipperBot and CrusherBot to BotRoster**

Add after the MJOLNIR entry in `data/BotRoster.js`:

```javascript
  {
    key: 'catapult',
    name: 'CATAPULT',
    botClass: FlipperBot,
    color: 0x1155cc,
    weapon: 'Flipper',
    description: 'Hydraulic flipper. Full\\ncharge = massive launch.',
    stats: { speed: 65, armor: 65, weapon: 80 }
  },
  {
    key: 'ironjaw',
    name: 'IRONJAW',
    botClass: CrusherBot,
    color: 0x882200,
    weapon: 'Crusher',
    description: 'Grab and steer. Ram\\nopponent into walls.',
    stats: { speed: 45, armor: 90, weapon: 70 }
  }
```

**Step 2: Add script tags to index.html**

After `<script src="bots/HammerBot.js"></script>`, add:

```html
  <script src="bots/FlipperBot.js"></script>
  <script src="bots/CrusherBot.js"></script>
```

**Step 3: Verify**

Open game → Play → Solo → Bot Select. Should see 6 bot cards in the scroll (CRUSHER, RAMPAGE, VORTEX, MJOLNIR, CATAPULT, IRONJAW). Dots at bottom should show 6 dots. Scroll arrows should work.

**Step 4: Commit**

```bash
git add data/BotRoster.js index.html
git commit -m "feat: add FlipperBot and CrusherBot to roster and index"
```

---

### Task 7: CustomBot class

**Files:**
- Create: `bots/CustomBot.js`
- Create: `data/CustomRoster.js`

**Context:** `CustomBot` is a runtime bot built from `{ name, color, chassis, armor, weapon }` config. It instantiates the appropriate weapon visuals by delegating to the same methods as the dedicated bot classes. The weapon logic is embedded inline in `CustomBot` — it's verbose but avoids a large refactor of existing bot classes.

Chassis/armor definitions live as constants in `CustomBot.js`.

**Step 1: Create `data/CustomRoster.js`**

```javascript
// data/CustomRoster.js
// Custom bots built in the Garage. Populated from localStorage at startup.
// Add new entries here programmatically — never hardcode.
const CUSTOM_ROSTER = [];

function loadCustomRoster() {
  try {
    const saved = localStorage.getItem('combatclankers_custom_bots');
    if (!saved) return;
    const list = JSON.parse(saved);
    list.forEach(cfg => {
      if (!CUSTOM_ROSTER.find(b => b.key === cfg.key)) {
        CUSTOM_ROSTER.push({
          key: cfg.key,
          name: cfg.name,
          botClass: CustomBot,    // filled after CustomBot is defined
          color: cfg.color,
          weapon: cfg.weapon,
          description: `${cfg.chassis} chassis\\n${cfg.armor} armor`,
          stats: CustomBot.computeDisplayStats(cfg),
          loadoutConfig: cfg      // pass full config to constructor
        });
      }
    });
  } catch (e) {
    console.warn('Failed to load custom roster:', e);
  }
}

function saveCustomBot(cfg) {
  try {
    const saved = localStorage.getItem('combatclankers_custom_bots');
    const list = saved ? JSON.parse(saved) : [];
    // Remove old entry with same key if re-saving
    const filtered = list.filter(b => b.key !== cfg.key);
    filtered.push(cfg);
    localStorage.setItem('combatclankers_custom_bots', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to save custom bot:', e);
  }
}
```

**Step 2: Create `bots/CustomBot.js`**

```javascript
// bots/CustomBot.js
// Chassis and armor definitions — used by GarageScene builder and CustomBot itself.
const CHASSIS_DEFS = {
  '2wheel':  { label: '2-WHEEL',  speed: 260, rotation: 80,  baseHP: 220, desc: 'Fastest. Low turning.' },
  '4wheel':  { label: '4-WHEEL',  speed: 200, rotation: 130, baseHP: 280, desc: 'Balanced all-rounder.' },
  '8wheel':  { label: '8-WHEEL',  speed: 140, rotation: 175, baseHP: 340, desc: 'Slowest. Iron-grip turn.' }
};

const ARMOR_DEFS = {
  light:  { label: 'LIGHT',  speedFactor: 1.25, hpFactor: 0.70, dr: 0.00, desc: 'Fragile but quick.' },
  medium: { label: 'MEDIUM', speedFactor: 1.00, hpFactor: 1.00, dr: 0.20, desc: 'Balanced protection.' },
  heavy:  { label: 'HEAVY',  speedFactor: 0.60, hpFactor: 1.40, dr: 0.35, desc: 'Slow but tough.' }
};

const WEAPON_DEFS = {
  wedge:   { label: 'Wedge',        power: 20, desc: 'No active weapon.' },
  hammer:  { label: 'Hammer',       power: 75, desc: 'Q: overhead slam.' },
  spinner: { label: 'Drum Spinner', power: 85, desc: 'Q: toggle spinner.' },
  flipper: { label: 'Flipper',      power: 80, desc: 'Q: hydraulic launch.' },
  crusher: { label: 'Crusher',      power: 70, desc: 'Q: grab and steer.' }
};

class CustomBot extends Bot {
  constructor(scene, x, y, rosterEntry) {
    const cfg = rosterEntry.loadoutConfig;
    const stats = CustomBot._computeStats(cfg);
    const textureKey = `custom_${cfg.key}`;

    if (!scene.textures.exists(textureKey)) {
      CustomBot._makeTexture(scene, textureKey, cfg.color);
    }

    super(scene, x, y, {
      key: textureKey,
      color: cfg.color,
      hp: stats.hp,
      driveHP: 50,
      weaponHP: 55,
      speed: stats.speed,
      rotationSpeed: stats.rotation
    });

    this._loadout = cfg;
    this._damageReduction = stats.dr;
    this._weaponType = cfg.weapon;

    // Name label
    this.nameLabel = scene.add.text(x, y - 38, cfg.name.toUpperCase(), {
      fontSize: '11px', color: '#' + cfg.color.toString(16).padStart(6, '0'),
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    // Init weapon-specific state
    this._initWeapon(scene, x, y);
  }

  static _computeStats(cfg) {
    const ch = CHASSIS_DEFS[cfg.chassis] || CHASSIS_DEFS['4wheel'];
    const ar = ARMOR_DEFS[cfg.armor] || ARMOR_DEFS.medium;
    return {
      speed:    Math.round(ch.speed * ar.speedFactor),
      hp:       Math.round(ch.baseHP * ar.hpFactor),
      rotation: ch.rotation,
      dr:       ar.dr
    };
  }

  static computeDisplayStats(cfg) {
    const ch = CHASSIS_DEFS[cfg.chassis] || CHASSIS_DEFS['4wheel'];
    const ar = ARMOR_DEFS[cfg.armor] || ARMOR_DEFS.medium;
    const wp = WEAPON_DEFS[cfg.weapon] || WEAPON_DEFS.wedge;
    // Normalize to 0-100 display range
    const speedNorm = Math.round((ch.speed * ar.speedFactor) / 3.25);
    const armorNorm = Math.round(40 + ar.dr * 100 + ar.hpFactor * 25);
    return { speed: Math.min(100, speedNorm), armor: Math.min(100, armorNorm), weapon: wp.power };
  }

  static _makeTexture(scene, key, color) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(color, 1);
    g.fillRect(0, 5, w - 15, h - 10);
    g.fillStyle(0xaaaaaa, 1);
    g.fillTriangle(w - 15, 5, w - 15, h - 10, w, h / 2);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(2, 2, w - 18, 9);
    g.fillRect(2, h - 11, w - 18, 9);
    g.fillStyle(0x444444, 1);
    for (let i = 4; i < w - 20; i += 9) {
      g.fillRect(i, 3, 5, 7);
      g.fillRect(i, h - 10, 5, 7);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _initWeapon(scene, x, y) {
    switch (this._weaponType) {
      case 'spinner':
        this.spinnerActive = false;
        this.spinEnergy = 0;
        this.spinnerAngle = 0;
        this._jWasDown = false;
        this._ringGfx = scene.add.graphics().setDepth(3);
        this._spinGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'SPIN: OFF', {
          fontSize: '9px', color: '#226633', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'hammer':
        this.hammerSwinging = false;
        this._hammerAngle = -0.9;
        this._hammerReturning = false;
        this._hitDealt = false;
        this._jWasDown = false;
        this._swingEnemy = null;
        this._swingGlow = false;
        this._hammerGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'HAMMER READY', {
          fontSize: '9px', color: '#886622', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'flipper':
        this.flipCharge = 100;
        this._flipArmAngle = 0;
        this._armFiring = false;
        this._armReturnDelay = 0;
        this._jWasDown = false;
        this._wallCheckTimer = 0;
        this._flippedEnemy = null;
        this._wallSlamDealt = false;
        this._flipGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, '▓▓▓▓▓ READY', {
          fontSize: '9px', color: '#4488ff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'crusher':
        this.crushGrabActive = false;
        this._grabTimer = 0;
        this._grabCooldown = 0;
        this._jWasDown = false;
        this._clawAngle = 0.5;
        this._wallSlamCooldown = 0;
        this._clawGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'JAWS: OPEN', {
          fontSize: '9px', color: '#884422', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
    }
  }

  takeDamage(amount, zone) {
    return super.takeDamage(amount * (1 - this._damageReduction), zone);
  }

  // Delegate updateWeapon to the matching dedicated bot prototype methods
  updateWeapon(keys, delta, enemy) {
    switch (this._weaponType) {
      case 'spinner': SpinnerBot.prototype.updateWeapon.call(this, keys, delta); break;
      case 'hammer':  HammerBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
      case 'flipper': FlipperBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
      case 'crusher': CrusherBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    // Sync passive weapon gfx
    switch (this._weaponType) {
      case 'spinner': if (!this.spinnerActive) SpinnerBot.prototype._updateSpinnerGfx.call(this); break;
      case 'hammer':  if (!this.hammerSwinging) HammerBot.prototype._updateHammerGfx.call(this); break;
      case 'flipper': if (!this._armFiring) FlipperBot.prototype._updateFlipperGfx.call(this); break;
      case 'crusher': if (!this.crushGrabActive) CrusherBot.prototype._updateClawGfx.call(this); break;
    }
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    ['_ringGfx','_spinGfx','_hammerGfx','_flipGfx','_chargeBar','_clawGfx'].forEach(k => {
      if (this[k]) this[k].destroy();
    });
    super.destroy(fromScene);
  }
}
```

**Step 3: Add script tags to index.html**

After `<script src="data/BotRoster.js"></script>`, add:

```html
  <script src="data/CustomRoster.js"></script>
```

After `<script src="bots/CrusherBot.js"></script>`, add:

```html
  <script src="bots/CustomBot.js"></script>
```

**Step 4: Call `loadCustomRoster()` in game.js**

In `game.js`, before `window.game = new Phaser.Game(config);`, add:

```javascript
loadCustomRoster();
```

**Step 5: Update BattleScene to check CUSTOM_ROSTER**

In `BattleScene.createBots()`, update the `find` calls:

```javascript
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const playerDef = allBots.find(b => b.key === this.playerBotKey) || BOT_ROSTER[0];
    const aiDef = allBots.find(b => b.key === this.aiBotKey) || BOT_ROSTER[1] || BOT_ROSTER[0];
```

**Step 6: Commit**

```bash
git add bots/CustomBot.js data/CustomRoster.js index.html game.js scenes/BattleScene.js
git commit -m "feat: CustomBot class and CustomRoster with localStorage persistence"
```

---

### Task 8: GarageScene rewrite — bot builder UI

**Files:**
- Rewrite: `scenes/GarageScene.js`

**Context:** Full replacement of the Garage viewer with a 4-step builder (name → chassis → armor → weapon) plus a color picker and live stat preview. All Phaser-native (no DOM). Name input uses keyboard event capture.

**Step 1: Rewrite `scenes/GarageScene.js`**

This is the largest task. The scene manages `_step` (0=name, 1=chassis, 2=armor, 3=weapon), renders the appropriate UI for each step, and updates a live preview on the right.

```javascript
class GarageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GarageScene' });
  }

  create() {
    this._cfg = { name: '', color: 0x1155cc, chassis: '4wheel', armor: 'medium', weapon: 'wedge' };
    this._step = 0; // 0=name, 1=chassis, 2=armor, 3=weapon
    this._nameInput = '';
    this._nameCursorVisible = true;
    this._nameCursorTimer = 0;
    this._uiObjects = []; // cleared on step change

    this.drawBackground();

    this.add.text(450, 40, 'GARAGE — BUILD YOUR BOT', {
      fontSize: '28px', color: '#ffaa00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Step indicator
    this._stepDots = [];
    ['NAME', 'CHASSIS', 'ARMOR', 'WEAPON'].forEach((label, i) => {
      const x = 240 + i * 140;
      const dot = this.add.circle(x, 78, 7, 0x223344).setDepth(10);
      const txt = this.add.text(x, 93, label, {
        fontSize: '9px', color: '#334455', fontFamily: 'monospace'
      }).setOrigin(0.5).setDepth(10);
      this._stepDots.push({ dot, txt });
    });

    // Static preview panel (right side)
    this._previewPanel = this.add.graphics();
    this._previewLabel = this.add.text(740, 130, 'PREVIEW', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this._previewStatGfx = null; // drawn dynamically
    this._previewStatTexts = [];

    // Color swatches (shown on all steps)
    this._drawColorSwatches();

    // Navigation buttons
    this._backBtn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    this._backBtn.on('pointerover', () => this._backBtn.setColor('#aabbcc'));
    this._backBtn.on('pointerout', () => this._backBtn.setColor('#556677'));
    this._backBtn.on('pointerdown', () => {
      if (this._step === 0) { this.scene.start('MainMenuScene'); }
      else { this._step--; this._renderStep(); }
    });

    this._nextBtn = this.add.rectangle(650, 600, 180, 44, 0x224466)
      .setInteractive({ useHandCursor: true });
    this._nextTxt = this.add.text(650, 600, 'NEXT ►', {
      fontSize: '18px', color: '#aaccee', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this._nextBtn.on('pointerover', () => this._nextBtn.setFillStyle(0x336688));
    this._nextBtn.on('pointerout', () => this._nextBtn.setFillStyle(0x224466));
    this._nextBtn.on('pointerdown', () => this._onNext());

    // BUILD IT button (shown only on last step)
    this._buildBtn = this.add.rectangle(650, 600, 180, 44, 0x883300).setVisible(false)
      .setInteractive({ useHandCursor: true });
    this._buildTxt = this.add.text(650, 600, 'BUILD IT!', {
      fontSize: '18px', color: '#ffcc44', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);
    this._buildBtn.on('pointerover', () => this._buildBtn.setFillStyle(0xcc4400));
    this._buildBtn.on('pointerout', () => this._buildBtn.setFillStyle(0x883300));
    this._buildBtn.on('pointerdown', () => this._buildBot());

    // Keyboard for name input
    this.input.keyboard.on('keydown', (e) => {
      if (this._step !== 0) return;
      if (e.key === 'Backspace') {
        this._nameInput = this._nameInput.slice(0, -1);
      } else if (e.key.length === 1 && this._nameInput.length < 12) {
        this._nameInput += e.key.toUpperCase();
      }
      this._cfg.name = this._nameInput;
      this._renderStep();
    });

    this._renderStep();
  }

  _drawColorSwatches() {
    const colors = [
      0xcc2200, 0xff6600, 0xffcc00, 0x88cc00,
      0x00aa44, 0x0088cc, 0x1144cc, 0x6622cc,
      0xaa00aa, 0xcc0066, 0x884422, 0x557788,
      0x222266, 0x444444, 0xaaaaaa, 0xffffff
    ];
    const startX = 580, startY = 460;
    colors.forEach((color, i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const cx = startX + col * 22;
      const cy = startY + row * 22;
      const swatch = this.add.circle(cx, cy, 8, color)
        .setInteractive({ useHandCursor: true });
      swatch.on('pointerover', () => swatch.setScale(1.3));
      swatch.on('pointerout', () => swatch.setScale(this._cfg.color === color ? 1.4 : 1.0));
      swatch.on('pointerdown', () => {
        this._cfg.color = color;
        this._updatePreview();
        // Reset all swatches to normal
        this._swatches?.forEach(s => s.setScale(1.0));
        swatch.setScale(1.4);
      });
      if (!this._swatches) this._swatches = [];
      this._swatches.push(swatch);
    });
    this.add.text(580, 444, 'COLOR', {
      fontSize: '9px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(0);
  }

  _renderStep() {
    // Destroy previous step UI
    this._uiObjects.forEach(o => o.destroy());
    this._uiObjects = [];

    this._updateStepDots();

    // Toggle next/build buttons
    const isLast = this._step === 3;
    this._nextBtn.setVisible(!isLast);
    this._nextTxt.setVisible(!isLast);
    this._buildBtn.setVisible(isLast);
    this._buildTxt.setVisible(isLast);

    switch (this._step) {
      case 0: this._renderNameStep(); break;
      case 1: this._renderChassisStep(); break;
      case 2: this._renderArmorStep(); break;
      case 3: this._renderWeaponStep(); break;
    }

    this._updatePreview();
  }

  _updateStepDots() {
    this._stepDots.forEach(({ dot, txt }, i) => {
      dot.setFillStyle(i === this._step ? 0xffaa00 : (i < this._step ? 0x448844 : 0x223344));
      txt.setColor(i === this._step ? '#ffaa00' : (i < this._step ? '#44aa44' : '#334455'));
    });
  }

  _renderNameStep() {
    const add = (o) => { this._uiObjects.push(o); return o; };

    add(this.add.text(240, 160, 'NAME YOUR BOT', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    add(this.add.text(240, 200, 'Up to 12 characters', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5));

    // Input box
    add(this.add.rectangle(240, 280, 320, 52, 0x111122));
    const inputBorder = add(this.add.graphics());
    inputBorder.lineStyle(2, 0x4488ff, 0.8);
    inputBorder.strokeRect(240 - 160, 280 - 26, 320, 52);

    const cursor = this._nameCursorVisible ? '█' : ' ';
    this._nameDisplay = add(this.add.text(240, 280,
      (this._nameInput || '') + cursor, {
        fontSize: '22px', color: '#ffffff', fontFamily: 'monospace'
      }).setOrigin(0.5));

    if (!this._nameInput) {
      add(this.add.text(240, 280, 'TYPE YOUR NAME...', {
        fontSize: '16px', color: '#333355', fontFamily: 'monospace'
      }).setOrigin(0.5));
    }

    add(this.add.text(240, 340, 'Press keys to type  •  BACKSPACE to delete', {
      fontSize: '10px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(0.5));
  }

  _renderChassisStep() {
    const add = (o) => { this._uiObjects.push(o); return o; };
    add(this.add.text(240, 145, 'CHOOSE CHASSIS', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const keys = ['2wheel', '4wheel', '8wheel'];
    const icons = ['⚡', '⚖', '🔩'];
    keys.forEach((key, i) => {
      const def = CHASSIS_DEFS[key];
      const x = 100 + i * 150;
      const y = 320;
      const isSelected = this._cfg.chassis === key;

      const card = add(this.add.rectangle(x, y, 130, 200, isSelected ? 0x192a44 : 0x111122)
        .setInteractive({ useHandCursor: true }));
      const border = add(this.add.graphics());
      border.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffaa00 : 0x334455, isSelected ? 1 : 0.5);
      border.strokeRect(x - 65, y - 100, 130, 200);

      add(this.add.text(x, y - 75, icons[i], { fontSize: '28px' }).setOrigin(0.5));
      add(this.add.text(x, y - 38, def.label, {
        fontSize: '13px', color: isSelected ? '#ffaa00' : '#aabbcc', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5));
      add(this.add.text(x, y - 10, def.desc, {
        fontSize: '10px', color: '#556677', fontFamily: 'monospace',
        wordWrap: { width: 110 }, align: 'center'
      }).setOrigin(0.5));

      // Mini stat bars
      const spd = Math.round(def.speed / 3.25);
      const rot = Math.round(def.rotation / 1.75);
      const hp  = Math.round(def.baseHP / 3.4);
      [['SPD', spd, 0x44aaff], ['TURN', rot, 0xffaa44], ['HP', hp, 0x44ff88]].forEach(([lbl, val, col], j) => {
        const by = y + 32 + j * 22;
        add(this.add.text(x - 50, by, lbl, { fontSize: '9px', color: '#445566', fontFamily: 'monospace' }).setOrigin(0, 0.5));
        add(this.add.rectangle(x - 18, by, 80, 7, 0x222233).setOrigin(0, 0.5));
        add(this.add.rectangle(x - 18, by, Math.round(80 * val / 100), 7, col).setOrigin(0, 0.5));
      });

      card.on('pointerdown', () => { this._cfg.chassis = key; this._renderStep(); });
    });
  }

  _renderArmorStep() {
    const add = (o) => { this._uiObjects.push(o); return o; };
    add(this.add.text(240, 145, 'CHOOSE ARMOR', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const keys = ['light', 'medium', 'heavy'];
    const colors = [0x44aaff, 0x44ff88, 0xff4444];
    keys.forEach((key, i) => {
      const def = ARMOR_DEFS[key];
      const x = 100 + i * 150;
      const y = 320;
      const isSelected = this._cfg.armor === key;

      const card = add(this.add.rectangle(x, y, 130, 200, isSelected ? 0x192a44 : 0x111122)
        .setInteractive({ useHandCursor: true }));
      const border = add(this.add.graphics());
      border.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffaa00 : 0x334455, isSelected ? 1 : 0.5);
      border.strokeRect(x - 65, y - 100, 130, 200);

      add(this.add.text(x, y - 75, def.label, {
        fontSize: '16px', color: isSelected ? '#ffaa00' : colors[i].toString(16).padStart(6,'0').replace(/^/,'#'),
        fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5));
      add(this.add.text(x, y - 50, def.desc, {
        fontSize: '10px', color: '#556677', fontFamily: 'monospace', wordWrap: { width: 110 }, align: 'center'
      }).setOrigin(0.5));

      [
        ['SPEED ×', def.speedFactor.toFixed(2), 0x44aaff],
        ['HP ×',    def.hpFactor.toFixed(2),    0x44ff88],
        ['DMG RED', `${Math.round(def.dr * 100)}%`, 0xff8844]
      ].forEach(([lbl, val, col], j) => {
        const by = y - 10 + j * 30;
        add(this.add.text(x, by, `${lbl}  ${val}`, {
          fontSize: '11px', color: isSelected ? '#' + col.toString(16).padStart(6,'0') : '#445566',
          fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5));
      });

      card.on('pointerdown', () => { this._cfg.armor = key; this._renderStep(); });
    });
  }

  _renderWeaponStep() {
    const add = (o) => { this._uiObjects.push(o); return o; };
    add(this.add.text(240, 145, 'CHOOSE WEAPON', {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const keys = ['wedge', 'hammer', 'spinner', 'flipper', 'crusher'];
    const VISIBLE = 3;
    if (!this._weaponScroll) this._weaponScroll = 0;

    // Scroll arrows
    if (this._weaponScroll > 0) {
      const la = add(this.add.text(25, 320, '◄', {
        fontSize: '22px', color: '#778899', fontFamily: 'monospace'
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }));
      la.on('pointerdown', () => { this._weaponScroll--; this._renderStep(); });
    }
    if (this._weaponScroll < keys.length - VISIBLE) {
      const ra = add(this.add.text(455, 320, '►', {
        fontSize: '22px', color: '#778899', fontFamily: 'monospace'
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }));
      ra.on('pointerdown', () => { this._weaponScroll++; this._renderStep(); });
    }

    const visibleKeys = keys.slice(this._weaponScroll, this._weaponScroll + VISIBLE);
    visibleKeys.forEach((key, i) => {
      const def = WEAPON_DEFS[key];
      const x = 100 + i * 140;
      const y = 320;
      const isSelected = this._cfg.weapon === key;

      const card = add(this.add.rectangle(x, y, 120, 200, isSelected ? 0x192a44 : 0x111122)
        .setInteractive({ useHandCursor: true }));
      const border = add(this.add.graphics());
      border.lineStyle(isSelected ? 3 : 1, isSelected ? 0xffaa00 : 0x334455, isSelected ? 1 : 0.5);
      border.strokeRect(x - 60, y - 100, 120, 200);

      add(this.add.text(x, y - 72, def.label, {
        fontSize: '12px', color: isSelected ? '#ffaa00' : '#aabbcc',
        fontFamily: 'monospace', fontStyle: 'bold', wordWrap: { width: 110 }, align: 'center'
      }).setOrigin(0.5));
      add(this.add.text(x, y - 30, def.desc, {
        fontSize: '10px', color: '#556677', fontFamily: 'monospace',
        wordWrap: { width: 108 }, align: 'center'
      }).setOrigin(0.5));

      // Weapon power bar
      add(this.add.text(x, y + 20, 'POWER', { fontSize: '9px', color: '#445566', fontFamily: 'monospace' }).setOrigin(0.5));
      add(this.add.rectangle(x - 44, y + 35, 88, 8, 0x222233).setOrigin(0, 0.5));
      add(this.add.rectangle(x - 44, y + 35, Math.round(88 * def.power / 100), 8, 0xff8844).setOrigin(0, 0.5));

      card.on('pointerdown', () => { this._cfg.weapon = key; this._renderStep(); });
    });
  }

  _updatePreview() {
    // Clear old preview stat objects
    this._previewStatTexts.forEach(o => o.destroy());
    this._previewStatTexts = [];
    if (this._previewStatGfx) { this._previewStatGfx.destroy(); this._previewStatGfx = null; }

    const g = this.add.graphics();
    this._previewStatGfx = g;

    const px = 740;
    const stats = CustomBot.computeDisplayStats(this._cfg);
    const colorHex = '#' + this._cfg.color.toString(16).padStart(6, '0');

    this._previewStatTexts.push(this.add.text(px, 155, this._cfg.name || '???', {
      fontSize: '18px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Bot silhouette (simple rectangle preview)
    g.fillStyle(this._cfg.color, 1);
    g.fillRect(px - 30, 180, 50, 30);
    g.fillStyle(0xaaaaaa, 0.6);
    g.fillTriangle(px + 20, 180, px + 20, 210, px + 36, 195);

    const ch = CHASSIS_DEFS[this._cfg.chassis] || CHASSIS_DEFS['4wheel'];
    const ar = ARMOR_DEFS[this._cfg.armor] || ARMOR_DEFS.medium;
    const wp = WEAPON_DEFS[this._cfg.weapon] || WEAPON_DEFS.wedge;

    this._previewStatTexts.push(this.add.text(px, 228, `${ch.label} / ${ar.label.toUpperCase()}`, {
      fontSize: '9px', color: '#556677', fontFamily: 'monospace'
    }).setOrigin(0.5));
    this._previewStatTexts.push(this.add.text(px, 245, wp.label, {
      fontSize: '10px', color: '#888899', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const bw = 120;
    [['SPEED', stats.speed, 0x44aaff], ['ARMOR', stats.armor, 0x44ff88], ['WEAPON', stats.weapon, 0xff8844]]
      .forEach(([lbl, val, col], i) => {
        const by = 280 + i * 28;
        this._previewStatTexts.push(this.add.text(px - bw / 2, by, lbl, {
          fontSize: '9px', color: '#445566', fontFamily: 'monospace'
        }).setOrigin(0, 0.5));
        g.fillStyle(0x222233, 1);
        g.fillRect(px - bw / 2, by + 10, bw, 8);
        g.fillStyle(col, 1);
        g.fillRect(px - bw / 2, by + 10, Math.round(bw * val / 100), 8);
      });
  }

  _onNext() {
    if (this._step === 0 && !this._cfg.name.trim()) {
      // Flash the input to indicate name is required
      this.tweens.add({
        targets: this._nameDisplay,
        alpha: 0,
        duration: 100,
        yoyo: true,
        repeat: 2
      });
      return;
    }
    if (this._step < 3) {
      this._step++;
      this._weaponScroll = 0;
      this._renderStep();
    }
  }

  _buildBot() {
    if (!this._cfg.name.trim()) { this._onNext(); return; }
    const key = `custom_${Date.now()}`;
    const cfg = { ...this._cfg, key };
    saveCustomBot(cfg);

    // Add to CUSTOM_ROSTER for this session
    CUSTOM_ROSTER.push({
      key,
      name: cfg.name.toUpperCase(),
      botClass: CustomBot,
      color: cfg.color,
      weapon: WEAPON_DEFS[cfg.weapon]?.label || cfg.weapon,
      description: `${CHASSIS_DEFS[cfg.chassis]?.label} / ${ARMOR_DEFS[cfg.armor]?.label}`,
      stats: CustomBot.computeDisplayStats(cfg),
      loadoutConfig: cfg
    });

    this.scene.start('BotSelectScene');
  }

  update(time, delta) {
    // Cursor blink
    if (this._step === 0) {
      this._nameCursorTimer += delta;
      if (this._nameCursorTimer > 500) {
        this._nameCursorTimer = 0;
        this._nameCursorVisible = !this._nameCursorVisible;
        this._renderStep();
      }
    }
  }

  drawBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, 900, 650);
    bg.lineStyle(1, 0x111133, 0.8);
    for (let x = 0; x < 900; x += 55) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, 650); bg.strokePath();
    }
    for (let y = 0; y < 650; y += 55) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(900, y); bg.strokePath();
    }
    // Right panel divider
    bg.lineStyle(1, 0x223344, 0.8);
    bg.beginPath(); bg.moveTo(560, 110); bg.lineTo(560, 540); bg.strokePath();
    this.add.text(740, 113, '── PREVIEW ──', {
      fontSize: '9px', color: '#223344', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }
}
```

**Step 2: Verify**

Open game → Garage. Should see the 4-step builder. Type a name with keyboard. Step through chassis/armor/weapon. Preview panel on right updates after each choice. BUILD IT saves and goes to BotSelect showing the new custom bot card.

**Step 3: Commit**

```bash
git add scenes/GarageScene.js
git commit -m "feat: GarageScene rewrite — full 4-step loadout builder with live preview"
```

---

### Task 9: BotSelectScene — display custom bots

**Files:**
- Modify: `scenes/BotSelectScene.js`

**Context:** BotSelectScene currently only reads `BOT_ROSTER`. It needs to also show `CUSTOM_ROSTER` bots, update `_maxScroll`, and update dots. The `startFight` method also needs to pick AI from both rosters.

**Step 1: Merge rosters in `create()`**

At the top of `create()`, add:

```javascript
    this._allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
```

Replace all references to `BOT_ROSTER` in this file with `this._allBots`:
- `this._maxScroll = Math.max(0, this._allBots.length - VISIBLE);`
- `this._allBots.forEach((botDef, i) => { this._createBotCard(...) });`
- Dot loop: `for (let i = 0; i < this._allBots.length; i++) { ... }`
- Dot center: `const dotsStartX = 450 - ((this._allBots.length - 1) * dotSpacing) / 2;`

**Step 2: Add `[CUSTOM]` badge to custom bot cards**

In `_createBotCard`, if `botDef.loadoutConfig` exists, add a small badge:

```javascript
    if (botDef.loadoutConfig) {
      const badge = this.add.text(x + 80, y - 175, '[CUSTOM]', {
        fontSize: '8px', color: '#ffaa00', fontFamily: 'monospace'
      }).setOrigin(1, 0);
      this.cardContainer.add(badge);
    }
```

**Step 3: Update `startFight` to use both rosters**

```javascript
  startFight() {
    if (!this.selectedKey) return;
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const others = allBots.filter(b => b.key !== this.selectedKey);
    const aiBotDef = others.length > 0
      ? others[Math.floor(Math.random() * others.length)]
      : allBots[0];
    this.scene.start('BattleScene', {
      playerBotKey: this.selectedKey,
      aiBotKey: aiBotDef.key
    });
  }
```

**Step 4: Verify**

Build a custom bot in the Garage. Go to BotSelect — it should appear alongside the preset bots with a `[CUSTOM]` badge. Scrolling, selection, and fight should all work. After a fight ends, Play Again should work normally.

**Step 5: Final commit + push**

```bash
git add scenes/BotSelectScene.js
git commit -m "feat: BotSelectScene shows custom bots from localStorage with CUSTOM badge"
git push origin master:main
```

---

## Testing Checklist

After all tasks complete, verify end-to-end:

- [ ] VORTEX spins up over 5 seconds, drifts sideways, resets on hit
- [ ] Full-spin collision: opponent flies back hard, KAPOW! text appears
- [ ] CATAPULT: full charge launches opponent far with FWOOSH!, wall hit triggers CRUNCH!
- [ ] CATAPULT: partial charge fires weaker with smaller text
- [ ] IRONJAW: Q grabs opponent in range, CLAMP! text, drives them into wall → SLAM!
- [ ] IRONJAW: auto-releases after 3 seconds
- [ ] Garage: 4-step builder works, name input accepts keyboard, color swatches work
- [ ] Custom bot: builds correctly, appears in BotSelect
- [ ] Custom bot weapon works in battle (spinner charges, hammer swings, etc.)
- [ ] BotSelect: scroll handles 6+ preset bots + custom bots
- [ ] Multiplayer: spinner energy shown on client, flipper charge bar synced, crusher grab visible
