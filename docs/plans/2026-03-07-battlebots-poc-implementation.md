# BattleBots PoC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable browser-based BattleBots PoC with two wedge bots, an arena with central pit, tank controls, and a simple AI opponent.

**Architecture:** Phaser.js v3 with Arcade Physics. No build tools — plain HTML + JS files opened directly in browser. BattleScene handles physics/game logic; UIScene overlays HUD; MenuScene is entry/result screen.

**Tech Stack:** Phaser 3.60 (CDN), vanilla JavaScript, no dependencies beyond Phaser.

---

### Task 1: Scaffold — index.html + game.js

**Files:**
- Create: `index.html`
- Create: `game.js`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BattleBots Arena</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="bots/Bot.js"></script>
  <script src="bots/WedgeBot1.js"></script>
  <script src="bots/WedgeBot2.js"></script>
  <script src="ai/BotAI.js"></script>
  <script src="scenes/MenuScene.js"></script>
  <script src="scenes/UIScene.js"></script>
  <script src="scenes/BattleScene.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

**Step 2: Create game.js**

```javascript
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 650,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } }
  },
  scene: [MenuScene, BattleScene, UIScene]
};

window.game = new Phaser.Game(config);
```

**Step 3: Verify**
Open index.html in browser. Should show a blank dark canvas (Phaser loaded, no scenes yet).

**Step 4: Commit**
```bash
git add index.html game.js
git commit -m "feat: scaffold Phaser project"
```

---

### Task 2: Bot base class

**Files:**
- Create: `bots/Bot.js`

**Step 1: Create bots/Bot.js**

```javascript
class Bot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    const key = config.key;
    if (!scene.textures.exists(key)) {
      Bot.createTexture(scene, config);
    }
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.botConfig = config;
    this.hp = config.hp || 100;
    this.maxHP = config.hp || 100;
    this.driveHP = config.driveHP || 50;
    this.maxDriveHP = config.driveHP || 50;
    this.weaponHP = config.weaponHP || 50;
    this.maxWeaponHP = config.weaponHP || 50;
    this.botSpeed = config.speed || 200;
    this.rotationSpeed = config.rotationSpeed || 150;

    this.body.setMaxVelocity(350, 350);
    this.setDepth(2);
    this.setOrigin(0.5, 0.5);

    this.shadow = scene.add.ellipse(x, y + 6, 58, 18, 0x000000, 0.35);
    this.shadow.setDepth(1);
  }

  static createTexture(scene, config) {
    const g = scene.make.graphics({ add: false });
    const w = 65;
    const h = 45;

    // Main body
    g.fillStyle(config.color, 1);
    g.fillRect(0, 5, w - 15, h - 10);

    // Wedge front
    g.fillStyle(config.wedgeColor || 0xaaaaaa, 1);
    g.fillTriangle(w - 15, 5, w - 15, h - 10, w, h / 2);

    // Tracks
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(2, 2, w - 18, 9);
    g.fillRect(2, h - 11, w - 18, 9);

    // Track segments
    g.fillStyle(0x444444, 1);
    for (let i = 4; i < w - 20; i += 9) {
      g.fillRect(i, 3, 5, 7);
      g.fillRect(i, h - 10, 5, 7);
    }

    // Body panel
    g.fillStyle(0x000000, 0.3);
    g.fillRect(8, 12, 22, h - 24);

    g.generateTexture(config.key, w, h);
    g.destroy();
  }

  takeDamage(amount, zone) {
    let multiplier = 1.0;
    if (zone === 'front') multiplier = 0.5;
    else if (zone === 'rear') multiplier = 1.5;

    const finalDamage = amount * multiplier;
    this.hp = Math.max(0, this.hp - finalDamage);

    // Damage drive slightly on any hit
    this.driveHP = Math.max(0, this.driveHP - finalDamage * 0.2);
    if (this.driveHP <= 10) {
      this.botSpeed = this.botConfig.speed * 0.4;
    }

    this.setTint(0xff5555);
    this.scene.time.delayedCall(130, () => {
      if (this.active) this.clearTint();
    });

    return this.hp <= 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.shadow) {
      this.shadow.setPosition(this.x + 3, this.y + 6);
    }
  }

  destroy(fromScene) {
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
```

---

### Task 3: WedgeBot1 and WedgeBot2

**Files:**
- Create: `bots/WedgeBot1.js`
- Create: `bots/WedgeBot2.js`

**Step 1: Create bots/WedgeBot1.js** (player bot — blue, Crusher)

```javascript
class WedgeBot1 extends Bot {
  constructor(scene, x, y) {
    super(scene, x, y, {
      key: 'wedgebot1',
      color: 0x1a5fb4,
      wedgeColor: 0x4a9fd4,
      hp: 100,
      driveHP: 50,
      weaponHP: 30,
      speed: 230,
      rotationSpeed: 165
    });
    this.setRotation(0);

    this.nameLabel = scene.add.text(x, y - 38, 'CRUSHER', {
      fontSize: '11px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    super.destroy(fromScene);
  }
}
```

**Step 2: Create bots/WedgeBot2.js** (AI bot — red, Rampage)

```javascript
class WedgeBot2 extends Bot {
  constructor(scene, x, y) {
    super(scene, x, y, {
      key: 'wedgebot2',
      color: 0xaa1111,
      wedgeColor: 0xdd4444,
      hp: 100,
      driveHP: 50,
      weaponHP: 30,
      speed: 205,
      rotationSpeed: 140
    });
    this.setRotation(Math.PI);

    this.nameLabel = scene.add.text(x, y - 38, 'RAMPAGE', {
      fontSize: '11px', color: '#dd4444', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    super.destroy(fromScene);
  }
}
```

---

### Task 4: BotAI

**Files:**
- Create: `ai/BotAI.js`

```javascript
class BotAI {
  constructor(bot, target) {
    this.bot = bot;
    this.target = target;
    this.state = 'chase';
    this.evadeTimer = 0;
    this.lastHP = bot.hp;
    this.stuckTimer = 0;
    this.lastPos = { x: bot.x, y: bot.y };
  }

  update(delta) {
    if (!this.bot.active || !this.target.active) return;

    const hpLoss = this.lastHP - this.bot.hp;
    if (hpLoss > 8) {
      this.state = 'evade';
      this.evadeTimer = 1200;
    }
    this.lastHP = this.bot.hp;

    // Unstick detection
    this.stuckTimer += delta;
    if (this.stuckTimer > 1200) {
      const dist = Phaser.Math.Distance.Between(
        this.bot.x, this.bot.y, this.lastPos.x, this.lastPos.y
      );
      if (dist < 15 && this.state !== 'evade') {
        this.state = 'evade';
        this.evadeTimer = 600;
      }
      this.lastPos = { x: this.bot.x, y: this.bot.y };
      this.stuckTimer = 0;
    }

    if (this.state === 'evade') {
      this.evadeTimer -= delta;
      if (this.evadeTimer <= 0) this.state = 'chase';
      this.doEvade();
    } else {
      this.doChase();
    }
  }

  doChase() {
    const bot = this.bot;
    const target = this.target;
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - bot.rotation);

    if (angleDiff > 0.12) {
      bot.body.setAngularVelocity(bot.rotationSpeed);
    } else if (angleDiff < -0.12) {
      bot.body.setAngularVelocity(-bot.rotationSpeed);
    } else {
      bot.body.setAngularVelocity(0);
    }

    if (Math.abs(angleDiff) < 0.6) {
      bot.body.setVelocity(
        Math.cos(bot.rotation) * bot.botSpeed,
        Math.sin(bot.rotation) * bot.botSpeed
      );
    }
  }

  doEvade() {
    const bot = this.bot;
    bot.body.setAngularVelocity(bot.rotationSpeed * 0.6);
    bot.body.setVelocity(
      -Math.cos(bot.rotation) * bot.botSpeed * 0.65,
      -Math.sin(bot.rotation) * bot.botSpeed * 0.65
    );
  }
}
```

---

### Task 5: BattleScene

**Files:**
- Create: `scenes/BattleScene.js`

```javascript
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.matchDuration = 180000;
    this.matchTimer = this.matchDuration;
    this.gameOver = false;
  }

  create() {
    this.gameOver = false;
    this.matchTimer = this.matchDuration;

    this.createArena();
    this.createBots();
    this.createControls();
    this.setupPhysics();
    this.scene.launch('UIScene');
  }

  createArena() {
    this.arenaX = 100;
    this.arenaY = 75;
    this.arenaW = 700;
    this.arenaH = 500;
    const cx = this.arenaX + this.arenaW / 2;
    const cy = this.arenaY + this.arenaH / 2;

    const g = this.add.graphics();

    // Floor
    g.fillStyle(0x1e1e30, 1);
    g.fillRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);

    // Grid
    g.lineStyle(1, 0x2a2a50, 0.6);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaW; x += 50) {
      g.beginPath(); g.moveTo(x, this.arenaY); g.lineTo(x, this.arenaY + this.arenaH); g.strokePath();
    }
    for (let y = this.arenaY; y <= this.arenaY + this.arenaH; y += 50) {
      g.beginPath(); g.moveTo(this.arenaX, y); g.lineTo(this.arenaX + this.arenaW, y); g.strokePath();
    }

    // Pit danger zone border
    const pitW = 140;
    const pitH = 140;
    g.fillStyle(0x880000, 0.6);
    g.fillRect(cx - pitW / 2 - 6, cy - pitH / 2 - 6, pitW + 12, pitH + 12);

    // Pit floor
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - pitW / 2, cy - pitH / 2, pitW, pitH);

    // Pit warning stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff0000 : 0x000000, 0.25);
      g.fillRect(cx - pitW / 2 + i * 18, cy - pitH / 2, 18, pitH);
    }

    // Pit depth effect (inner shadow)
    g.fillStyle(0x330000, 0.5);
    g.fillRect(cx - pitW / 2 + 8, cy - pitH / 2 + 8, pitW - 16, pitH - 16);

    // Pit label
    this.add.text(cx, cy, 'PIT', {
      fontSize: '20px', color: '#ff3333', fontFamily: 'monospace', fontStyle: 'bold', alpha: 0.8
    }).setOrigin(0.5).setDepth(1);

    // Walls (static physics bodies)
    const wallThick = 22;
    const wallColor = 0x556677;
    this.walls = this.physics.add.staticGroup();

    const addWall = (wx, wy, ww, wh) => {
      const rect = this.add.rectangle(wx, wy, ww, wh, wallColor).setDepth(2);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);

      // Wall highlight
      const hi = this.add.graphics().setDepth(3);
      hi.lineStyle(2, 0x8899aa, 0.8);
      hi.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    };

    // Top, bottom, left, right
    addWall(cx, this.arenaY + wallThick / 2, this.arenaW, wallThick);
    addWall(cx, this.arenaY + this.arenaH - wallThick / 2, this.arenaW, wallThick);
    addWall(this.arenaX + wallThick / 2, cy, wallThick, this.arenaH);
    addWall(this.arenaX + this.arenaW - wallThick / 2, cy, wallThick, this.arenaH);

    // Pit zone (overlap trigger)
    this.pitZone = this.add.zone(cx, cy, pitW, pitH);
    this.physics.add.existing(this.pitZone, true);

    this.pitX = cx;
    this.pitY = cy;
    this.pitW = pitW;
    this.pitH = pitH;
  }

  createBots() {
    this.playerBot = new WedgeBot1(this, 230, 325);
    this.aiBot = new WedgeBot2(this, 670, 325);
    this.botAI = new BotAI(this.aiBot, this.playerBot);
  }

  createControls() {
    this.keys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      primaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      secondaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    };
  }

  setupPhysics() {
    this.physics.add.collider(this.playerBot, this.walls);
    this.physics.add.collider(this.aiBot, this.walls);
    this.physics.add.collider(this.playerBot, this.aiBot, this.handleBotCollision, null, this);
    this.physics.add.overlap(this.playerBot, this.pitZone, () => this.knockOut(this.playerBot, 'pit'));
    this.physics.add.overlap(this.aiBot, this.pitZone, () => this.knockOut(this.aiBot, 'pit'));
  }

  handleBotCollision(bot1, bot2) {
    if (this.gameOver) return;
    const dvx = bot1.body.velocity.x - bot2.body.velocity.x;
    const dvy = bot1.body.velocity.y - bot2.body.velocity.y;
    const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
    if (relSpeed < 25) return;

    const baseDamage = relSpeed * 0.07;
    const zone1 = this.getHitZone(bot2, bot1);
    const zone2 = this.getHitZone(bot1, bot2);

    bot1.takeDamage(baseDamage, zone1);
    bot2.takeDamage(baseDamage, zone2);

    this.cameras.main.shake(120, 0.006);

    if (bot1.hp <= 0) this.knockOut(bot1, 'disable');
    else if (bot2.hp <= 0) this.knockOut(bot2, 'disable');
  }

  getHitZone(attacker, target) {
    const dx = attacker.x - target.x;
    const dy = attacker.y - target.y;
    const attackAngle = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(attackAngle - target.rotation);
    if (Math.abs(diff) < Math.PI / 3) return 'rear';
    if (Math.abs(diff) > Math.PI * 2 / 3) return 'front';
    return 'side';
  }

  knockOut(bot, reason) {
    if (this.gameOver) return;
    this.gameOver = true;

    const isPlayer = bot === this.playerBot;
    const winner = isPlayer ? 'AI' : 'Player';

    this.createExplosion(bot.x, bot.y);
    bot.setActive(false).setVisible(false);
    if (bot.shadow) bot.shadow.setVisible(false);
    if (bot.nameLabel) bot.nameLabel.setVisible(false);

    this.events.emit('gameOver', { winner, reason });

    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason } });
    });
  }

  createExplosion(x, y) {
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff, 0xff2200];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = Phaser.Math.Between(60, 180);
      const size = Phaser.Math.Between(3, 10);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const p = this.add.circle(x, y, size, color).setDepth(10);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }
    this.cameras.main.shake(300, 0.015);
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.matchTimer -= delta;
    if (this.matchTimer <= 0) {
      this.timeUp();
      return;
    }

    this.events.emit('timerUpdate', this.matchTimer);
    this.updatePlayerMovement();
    this.botAI.update(delta);
  }

  updatePlayerMovement() {
    const bot = this.playerBot;
    const keys = this.keys;

    if (keys.left.isDown) {
      bot.body.setAngularVelocity(-bot.rotationSpeed);
    } else if (keys.right.isDown) {
      bot.body.setAngularVelocity(bot.rotationSpeed);
    } else {
      bot.body.setAngularVelocity(0);
    }

    if (keys.up.isDown) {
      bot.body.setVelocity(
        Math.cos(bot.rotation) * bot.botSpeed,
        Math.sin(bot.rotation) * bot.botSpeed
      );
    } else if (keys.down.isDown) {
      bot.body.setVelocity(
        -Math.cos(bot.rotation) * bot.botSpeed * 0.65,
        -Math.sin(bot.rotation) * bot.botSpeed * 0.65
      );
    } else {
      bot.body.setVelocity(bot.body.velocity.x * 0.87, bot.body.velocity.y * 0.87);
    }
  }

  timeUp() {
    if (this.gameOver) return;
    this.gameOver = true;
    const winner = this.playerBot.hp >= this.aiBot.hp ? 'Player' : 'AI';
    this.events.emit('gameOver', { winner, reason: 'time' });
    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason: 'time' } });
    });
  }
}
```

---

### Task 6: UIScene (HUD)

**Files:**
- Create: `scenes/UIScene.js`

```javascript
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.battleScene = this.scene.get('BattleScene');

    // --- Player (left) ---
    this.add.text(25, 18, 'CRUSHER', {
      fontSize: '13px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold'
    });
    this.add.rectangle(25, 37, 210, 14, 0x222233).setOrigin(0);
    this.playerHPBar = this.add.rectangle(25, 37, 210, 14, 0x1a5fb4).setOrigin(0);
    this.add.text(25, 53, 'DRIVE', { fontSize: '9px', color: '#446655', fontFamily: 'monospace' });
    this.add.rectangle(25, 63, 210, 7, 0x111122).setOrigin(0);
    this.playerDriveBar = this.add.rectangle(25, 63, 210, 7, 0x22aa55).setOrigin(0);

    // --- AI (right) ---
    this.add.text(875, 18, 'RAMPAGE', {
      fontSize: '13px', color: '#dd4444', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.add.rectangle(875, 37, 210, 14, 0x222233).setOrigin(1, 0);
    this.aiHPBar = this.add.rectangle(875, 37, 210, 14, 0xaa1111).setOrigin(1, 0);
    this.add.text(875, 53, 'DRIVE', { fontSize: '9px', color: '#446655', fontFamily: 'monospace' }).setOrigin(1, 0);
    this.add.rectangle(875, 63, 210, 7, 0x111122).setOrigin(1, 0);
    this.aiDriveBar = this.add.rectangle(875, 63, 210, 7, 0x22aa55).setOrigin(1, 0);

    // --- Timer (center) ---
    this.timerText = this.add.text(450, 18, '3:00', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // --- Controls hint ---
    this.add.text(450, 628, 'WASD: Move/Turn  |  J: Primary  |  K: Secondary', {
      fontSize: '11px', color: '#3a3a5e', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // --- Game over overlay ---
    this.gameOverBg = this.add.rectangle(450, 325, 420, 180, 0x000000, 0.88).setVisible(false);
    this.gameOverText = this.add.text(450, 295, '', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);
    this.gameOverSub = this.add.text(450, 345, '', {
      fontSize: '15px', color: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);
    this.gameOverReturn = this.add.text(450, 380, 'Returning to menu...', {
      fontSize: '12px', color: '#555577', fontFamily: 'monospace'
    }).setOrigin(0.5).setVisible(false);

    // Events
    this.battleScene.events.on('timerUpdate', this.updateTimer, this);
    this.battleScene.events.on('gameOver', this.showGameOver, this);
  }

  updateTimer(ms) {
    const secs = Math.ceil(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    if (ms < 30000) this.timerText.setColor('#ff6633');
    else if (ms < 60000) this.timerText.setColor('#ffaa33');
    else this.timerText.setColor('#ffffff');
  }

  showGameOver(data) {
    const winnerName = data.winner === 'Player' ? 'CRUSHER' : 'RAMPAGE';
    const winColor = data.winner === 'Player' ? '#4a9fd4' : '#dd4444';
    const reasons = {
      pit: 'fell into the pit!',
      disable: 'was disabled!',
      time: "time's up — judges' decision!"
    };
    const loserName = data.winner === 'Player' ? 'Rampage' : 'Crusher';
    const reasonStr = data.reason === 'time'
      ? reasons.time
      : `${loserName} ${reasons[data.reason]}`;

    this.gameOverBg.setVisible(true);
    this.gameOverText.setText(`${winnerName} WINS!`).setColor(winColor).setVisible(true);
    this.gameOverSub.setText(reasonStr).setVisible(true);
    this.gameOverReturn.setVisible(true);
  }

  update() {
    const b = this.battleScene;
    if (!b || !b.playerBot || !b.aiBot) return;
    const p = b.playerBot;
    const a = b.aiBot;

    const pRatio = Math.max(0, p.hp / p.maxHP);
    const pDRatio = Math.max(0, p.driveHP / p.maxDriveHP);
    this.playerHPBar.setDisplaySize(Math.round(210 * pRatio), 14);
    this.playerDriveBar.setDisplaySize(Math.round(210 * pDRatio), 7);
    this.playerHPBar.setFillStyle(pRatio > 0.5 ? 0x1a5fb4 : pRatio > 0.25 ? 0xcc8800 : 0xcc2222);

    const aRatio = Math.max(0, a.hp / a.maxHP);
    const aDRatio = Math.max(0, a.driveHP / a.maxDriveHP);
    this.aiHPBar.setDisplaySize(Math.round(210 * aRatio), 14);
    this.aiDriveBar.setDisplaySize(Math.round(210 * aDRatio), 7);
    this.aiHPBar.setFillStyle(aRatio > 0.5 ? 0xaa1111 : aRatio > 0.25 ? 0xcc8800 : 0x882222);
  }
}
```

---

### Task 7: MenuScene

**Files:**
- Create: `scenes/MenuScene.js`

```javascript
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.resultData = data?.result || null;
  }

  create() {
    const cx = 450;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, 900, 650);

    // Decorative grid
    bg.lineStyle(1, 0x111133, 0.8);
    for (let x = 0; x < 900; x += 55) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, 650); bg.strokePath();
    }
    for (let y = 0; y < 650; y += 55) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(900, y); bg.strokePath();
    }

    // Title
    this.add.text(cx, 110, 'BATTLE', {
      fontSize: '80px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 195, 'BOTS', {
      fontSize: '80px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 285, 'A  R  E  N  A', {
      fontSize: '18px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Result from last match
    if (this.resultData) {
      const winColor = this.resultData.winner === 'Player' ? '#4a9fd4' : '#dd4444';
      const winName = this.resultData.winner === 'Player' ? 'Crusher' : 'Rampage';
      const msg = this.resultData.reason === 'time'
        ? `Last match: ${winName} wins on points!`
        : this.resultData.reason === 'pit'
          ? `Last match: ${winName} wins — pit KO!`
          : `Last match: ${winName} wins — disable!`;
      this.add.text(cx, 328, msg, {
        fontSize: '15px', color: winColor, fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // Play button
    const btnY = this.resultData ? 395 : 370;
    const btn = this.add.rectangle(cx, btnY, 240, 58, 0xcc2200)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(cx, btnY, 'FIGHT!', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.on('pointerover', () => { btn.setFillStyle(0xff4400); btnText.setColor('#ffcc00'); });
    btn.on('pointerout', () => { btn.setFillStyle(0xcc2200); btnText.setColor('#ffffff'); });
    btn.on('pointerdown', () => this.scene.start('BattleScene'));

    // Controls
    this.add.text(cx, btnY + 65, 'W/S: Throttle  |  A/D: Turn  |  J: Primary Fire  |  K: Secondary Fire', {
      fontSize: '11px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Matchup display
    this.add.text(cx - 180, btnY + 110, 'YOU', { fontSize: '12px', color: '#4a9fd4', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(cx - 180, btnY + 126, 'CRUSHER', { fontSize: '16px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, btnY + 118, 'VS', { fontSize: '20px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(cx + 180, btnY + 110, 'AI', { fontSize: '12px', color: '#dd4444', fontFamily: 'monospace' }).setOrigin(0.5);
    this.add.text(cx + 180, btnY + 126, 'RAMPAGE', { fontSize: '16px', color: '#dd4444', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5);

    // Version
    this.add.text(cx, 625, 'PoC v0.1  ·  1v1 vs AI  ·  Physics: Arcade  ·  Matter.js upgrade on roadmap', {
      fontSize: '10px', color: '#222233', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }
}
```

---

### Task 8: Verify end-to-end

**Step 1:** Open `index.html` in browser
**Step 2:** Confirm MenuScene loads with title and FIGHT button
**Step 3:** Click FIGHT — arena appears with two bots, HUD visible
**Step 4:** Drive with WASD, confirm tank controls feel right
**Step 5:** Ram AI bot, confirm collision damage, camera shake, HP bars update
**Step 6:** Push bot into pit, confirm explosion + game over screen
**Step 7:** Wait for return to menu, confirm result text shown

**Step 8: Commit**
```bash
git add .
git commit -m "feat: complete BattleBots PoC — arena, two wedge bots, AI, combat, pit KO"
```

---

## Roadmap

- [ ] Matter.js physics upgrade (real spinning weapon physics)
- [ ] Active weapons: spinner, flipper, hammer, drum
- [ ] Bot builder: chassis + weapon + upgrade slot
- [ ] Online 1v1 multiplayer (Socket.io + Node.js)
- [ ] Local 2v2 + tournament bracket
- [ ] More arenas with hazards (pulverizers, screws, flames)
- [ ] Full BattleBots roster (Tombstone, Minotaur, Witch Doctor, etc.)
