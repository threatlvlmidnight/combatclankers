# Menus & Garage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add MainMenu, ModeSelect, BotSelect, and Garage scenes with a central BotRoster data file, replacing the existing single MenuScene.

**Architecture:** Each screen is its own Phaser Scene. A shared `BOT_ROSTER` array (global JS) holds all bot definitions and is the single source of truth for bot stats, colors, and class references. BattleScene receives `playerBotKey`/`aiBotKey` via scene data and looks up the roster at runtime.

**Tech Stack:** Phaser 3.60, vanilla JS, no build tools.

---

### Task 1: BotRoster data file

**Files:**
- Create: `data/BotRoster.js`

**Step 1: Create the directory and file**

```bash
mkdir -p /c/Users/godda/Documents/battlebots/data
```

```javascript
// data/BotRoster.js
// Central bot definitions. botClass must be loaded before this file.
// Add new bots here — they automatically appear in Garage and BotSelect.
const BOT_ROSTER = [
  {
    key: 'crusher',
    name: 'CRUSHER',
    botClass: WedgeBot1,
    color: 0x1a5fb4,
    wedgeColor: 0x4a9fd4,
    weapon: 'Wedge',
    description: 'Classic wedge. Master of\npit control.',
    stats: { speed: 85, armor: 70, weapon: 20 }
  },
  {
    key: 'rampage',
    name: 'RAMPAGE',
    botClass: WedgeBot2,
    color: 0xaa1111,
    wedgeColor: 0xdd4444,
    weapon: 'Wedge',
    description: 'Aggressive wedge. Built\nto ram hard.',
    stats: { speed: 75, armor: 80, weapon: 20 }
  }
];
```

**Step 2: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add data/BotRoster.js && git commit -m "feat: add BotRoster data file"
```

---

### Task 2: MainMenuScene

**Files:**
- Create: `scenes/MainMenuScene.js`

**Step 1: Create the file**

```javascript
// scenes/MainMenuScene.js
class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  init(data) {
    this.resultData = data?.result || null;
  }

  create() {
    const cx = 450;
    this.drawBackground();

    // Title
    this.add.text(cx, 100, 'BATTLE', {
      fontSize: '80px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 185, 'BOTS', {
      fontSize: '80px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 275, 'A  R  E  N  A', {
      fontSize: '18px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Last match result
    if (this.resultData) {
      const isPlayerWin = this.resultData.winner === 'Player';
      const winColor = isPlayerWin ? '#4a9fd4' : '#dd4444';
      const winName = isPlayerWin
        ? (this.resultData.playerBotName || 'You')
        : (this.resultData.aiBotName || 'AI');
      const reasons = { pit: 'pit KO!', disable: 'disabled!', time: "judges' decision!" };
      this.add.text(cx, 318, `Last match: ${winName} won — ${reasons[this.resultData.reason] || ''}`, {
        fontSize: '14px', color: winColor, fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    const btnY = this.resultData ? 390 : 365;
    this.makeButton(cx, btnY, 'PLAY', 0xcc2200, 0xff4400, () => this.scene.start('ModeSelectScene'));
    this.makeButton(cx, btnY + 75, 'GARAGE', 0x1a3a5a, 0x2255aa, () => this.scene.start('GarageScene'));

    this.add.text(cx, 610, 'PoC v0.1  ·  Matter.js physics upgrade on roadmap', {
      fontSize: '10px', color: '#222233', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  makeButton(x, y, label, color, hoverColor, onClick) {
    const btn = this.add.rectangle(x, y, 240, 52, color).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(hoverColor); txt.setColor('#ffcc00'); });
    btn.on('pointerout', () => { btn.setFillStyle(color); txt.setColor('#ffffff'); });
    btn.on('pointerdown', onClick);
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
  }
}
```

**Step 2: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add scenes/MainMenuScene.js && git commit -m "feat: add MainMenuScene"
```

---

### Task 3: ModeSelectScene

**Files:**
- Create: `scenes/ModeSelectScene.js`

**Step 1: Create the file**

```javascript
// scenes/ModeSelectScene.js
class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });
  }

  create() {
    this.drawBackground();

    this.add.text(450, 120, 'SELECT MODE', {
      fontSize: '42px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // 1v1 vs AI — active
    this.makeMode(450, 290,
      '1v1 vs AI', 'Local · Single Player',
      0x1a3a1a, 0x33aa33,
      () => this.scene.start('BotSelectScene')
    );

    // Online — coming soon (greyed, not interactive)
    this.makeMode(450, 410,
      '1v1 Online', 'Coming Soon',
      0x111111, 0x333333,
      null
    );

    this.makeBackButton(() => this.scene.start('MainMenuScene'));
  }

  makeMode(x, y, title, subtitle, bgColor, borderColor, onClick) {
    const btn = this.add.rectangle(x, y, 320, 80, bgColor);
    const g = this.add.graphics();
    g.lineStyle(2, borderColor, 1);
    g.strokeRect(x - 160, y - 40, 320, 80);

    const titleColor = onClick ? '#66ee66' : '#444444';
    const subColor = onClick ? '#448844' : '#333333';

    this.add.text(x, y - 12, title, {
      fontSize: '28px', color: titleColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x, y + 20, subtitle, {
      fontSize: '13px', color: subColor, fontFamily: 'monospace'
    }).setOrigin(0.5);

    if (onClick) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setFillStyle(0x254425));
      btn.on('pointerout', () => btn.setFillStyle(bgColor));
      btn.on('pointerdown', onClick);
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
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
    btn.on('pointerdown', onClick);
  }
}
```

**Step 2: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add scenes/ModeSelectScene.js && git commit -m "feat: add ModeSelectScene"
```

---

### Task 4: BotSelectScene

**Files:**
- Create: `scenes/BotSelectScene.js`

**Step 1: Create the file**

```javascript
// scenes/BotSelectScene.js
class BotSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BotSelectScene' });
  }

  create() {
    this.selectedKey = null;
    this.cards = [];

    this.drawBackground();

    this.add.text(450, 55, 'CHOOSE YOUR BOT', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 98, 'Click a bot to select it, then hit FIGHT!', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Layout cards evenly
    const total = BOT_ROSTER.length;
    const spacing = 340;
    const startX = 450 - ((total - 1) * spacing) / 2;
    BOT_ROSTER.forEach((botDef, i) => {
      this.createBotCard(startX + i * spacing, 320, botDef);
    });

    // Fight button (disabled until selection)
    this.fightBg = this.add.rectangle(450, 575, 240, 52, 0x333333);
    this.fightTxt = this.add.text(450, 575, 'FIGHT!', {
      fontSize: '24px', color: '#666666', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.makeBackButton(() => this.scene.start('ModeSelectScene'));
  }

  createBotCard(x, y, botDef) {
    const cw = 300, ch = 330;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    const card = this.add.rectangle(x, y, cw, ch, 0x111122)
      .setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.4);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

    // Bot texture preview (reuse Bot.createTexture — no scene needed, just graphics)
    const previewKey = 'preview_' + botDef.key;
    if (!this.textures.exists(previewKey)) {
      Bot.createTexture(this, { ...botDef, key: previewKey });
    }
    this.add.image(x, y - 95, previewKey).setScale(2.5);

    this.add.text(x, y - 22, botDef.name, {
      fontSize: '22px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x, y + 10, botDef.weapon, {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.add.text(x, y + 38, botDef.description, {
      fontSize: '11px', color: '#667788', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5);

    this.drawStatBars(x, y + 100, botDef.stats);

    card.on('pointerover', () => {
      if (this.selectedKey !== botDef.key) card.setFillStyle(0x1a1a33);
    });
    card.on('pointerout', () => {
      if (this.selectedKey !== botDef.key) card.setFillStyle(0x111122);
    });
    card.on('pointerdown', () => this.selectBot(botDef.key));

    this.cards.push({ card, border, botDef, cw, ch });
  }

  drawStatBars(x, y, stats) {
    const entries = [
      { label: 'SPD', val: stats.speed, color: 0x44aaff },
      { label: 'ARM', val: stats.armor, color: 0x44ff88 },
      { label: 'WPN', val: stats.weapon, color: 0xff8844 }
    ];
    const bw = 160;
    entries.forEach(({ label, val, color }, i) => {
      const by = y + i * 22;
      this.add.text(x - bw / 2 - 2, by, label, {
        fontSize: '10px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(1, 0.5);
      this.add.rectangle(x + 5, by, bw, 8, 0x222233).setOrigin(0, 0.5);
      this.add.rectangle(x + 5, by, Math.round(bw * val / 100), 8, color).setOrigin(0, 0.5);
    });
  }

  selectBot(key) {
    this.selectedKey = key;

    this.cards.forEach(({ card, border, botDef, cw, ch }) => {
      if (botDef.key === key) {
        card.setFillStyle(0x192a44);
        border.clear();
        border.lineStyle(3, botDef.color, 1.0);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      } else {
        card.setFillStyle(0x111122);
        border.clear();
        border.lineStyle(2, botDef.color, 0.25);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      }
    });

    // Enable fight button
    this.fightBg.setFillStyle(0xcc2200).setInteractive({ useHandCursor: true });
    this.fightTxt.setColor('#ffffff');
    this.fightBg.removeAllListeners();
    this.fightBg.on('pointerover', () => this.fightBg.setFillStyle(0xff4400));
    this.fightBg.on('pointerout', () => this.fightBg.setFillStyle(0xcc2200));
    this.fightBg.on('pointerdown', () => this.startFight());
  }

  startFight() {
    if (!this.selectedKey) return;
    const others = BOT_ROSTER.filter(b => b.key !== this.selectedKey);
    const aiBotDef = others.length > 0
      ? others[Math.floor(Math.random() * others.length)]
      : BOT_ROSTER[0];
    this.scene.start('BattleScene', {
      playerBotKey: this.selectedKey,
      aiBotKey: aiBotDef.key
    });
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
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
    btn.on('pointerdown', onClick);
  }
}
```

**Step 2: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add scenes/BotSelectScene.js && git commit -m "feat: add BotSelectScene"
```

---

### Task 5: GarageScene

**Files:**
- Create: `scenes/GarageScene.js`

**Step 1: Create the file**

```javascript
// scenes/GarageScene.js
class GarageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GarageScene' });
  }

  create() {
    this.drawBackground();

    this.add.text(450, 55, 'GARAGE', {
      fontSize: '44px', color: '#ffaa00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 100, 'Browse available bots — select your bot in the Play menu', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const total = BOT_ROSTER.length;
    const spacing = 340;
    const startX = 450 - ((total - 1) * spacing) / 2;
    BOT_ROSTER.forEach((botDef, i) => {
      this.createBotCard(startX + i * spacing, 335, botDef);
    });

    this.makeBackButton(() => this.scene.start('MainMenuScene'));
  }

  createBotCard(x, y, botDef) {
    const cw = 300, ch = 360;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    this.add.rectangle(x, y, cw, ch, 0x111122);
    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.6);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

    const previewKey = 'preview_' + botDef.key;
    if (!this.textures.exists(previewKey)) {
      Bot.createTexture(this, { ...botDef, key: previewKey });
    }
    this.add.image(x, y - 110, previewKey).setScale(2.5);

    this.add.text(x, y - 38, botDef.name, {
      fontSize: '24px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(x, y - 8, `Weapon: ${botDef.weapon}`, {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.add.text(x, y + 20, botDef.description, {
      fontSize: '11px', color: '#667788', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5);

    this.drawStatBars(x, y + 85, botDef.stats);
  }

  drawStatBars(x, y, stats) {
    const entries = [
      { label: 'SPEED',  val: stats.speed,  color: 0x44aaff },
      { label: 'ARMOR',  val: stats.armor,  color: 0x44ff88 },
      { label: 'WEAPON', val: stats.weapon, color: 0xff8844 }
    ];
    const bw = 170;
    entries.forEach(({ label, val, color }, i) => {
      const by = y + i * 26;
      this.add.text(x - bw / 2 - 4, by, label, {
        fontSize: '10px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(1, 0.5);
      this.add.rectangle(x + 5, by, bw, 10, 0x222233).setOrigin(0, 0.5);
      this.add.rectangle(x + 5, by, Math.round(bw * val / 100), 10, color).setOrigin(0, 0.5);
      this.add.text(x + 5 + bw + 6, by, String(val), {
        fontSize: '10px', color: '#667788', fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
    });
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
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
    btn.on('pointerdown', onClick);
  }
}
```

**Step 2: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add scenes/GarageScene.js && git commit -m "feat: add GarageScene"
```

---

### Task 6: Update BattleScene and UIScene

**Files:**
- Modify: `scenes/BattleScene.js`
- Modify: `scenes/UIScene.js`

**Step 1: Add `init()` to BattleScene (before `create()`)**

Add this method at the top of the class, before `create()`:

```javascript
  init(data) {
    this.playerBotKey = data?.playerBotKey || 'crusher';
    this.aiBotKey = data?.aiBotKey || 'rampage';
  }
```

**Step 2: Replace `createBots()` in BattleScene**

Replace the existing `createBots()`:

```javascript
  createBots() {
    const playerDef = BOT_ROSTER.find(b => b.key === this.playerBotKey) || BOT_ROSTER[0];
    const aiDef = BOT_ROSTER.find(b => b.key === this.aiBotKey) || BOT_ROSTER[1] || BOT_ROSTER[0];
    this.playerBotDef = playerDef;
    this.aiBotDef = aiDef;
    this.playerBot = new playerDef.botClass(this, 150, 343);
    this.aiBot = new aiDef.botClass(this, 680, 200);
    this.botAI = new BotAI(this.aiBot, this.playerBot, { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH });
  }
```

**Step 3: Update navigation in `knockOut()` and `timeUp()` in BattleScene**

In both `knockOut()` and `timeUp()`, change `'MenuScene'` to `'MainMenuScene'` and include bot names in result:

In `knockOut()`, change:
```javascript
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason } });
```
To:
```javascript
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene', { result: { winner, reason, playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
```

In `timeUp()`, change:
```javascript
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason: 'time' } });
```
To:
```javascript
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene', { result: { winner, reason: 'time', playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
```

**Step 4: Update UIScene to read bot names from BattleScene**

In `UIScene.create()`, replace the two hardcoded name strings and their colors:

Replace:
```javascript
    this.add.text(25, 18, 'CRUSHER', {
      fontSize: '13px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold'
    });
```
With:
```javascript
    const pDef = this.battleScene.playerBotDef || BOT_ROSTER[0];
    const aDef = this.battleScene.aiBotDef || BOT_ROSTER[1] || BOT_ROSTER[0];
    const pColorHex = '#' + pDef.color.toString(16).padStart(6, '0');
    const aColorHex = '#' + aDef.color.toString(16).padStart(6, '0');

    this.add.text(25, 18, pDef.name, {
      fontSize: '13px', color: pColorHex, fontFamily: 'monospace', fontStyle: 'bold'
    });
```

Replace:
```javascript
    this.add.rectangle(25, 37, 210, 14, 0x222233).setOrigin(0);
    this.playerHPBar = this.add.rectangle(25, 37, 210, 14, 0x1a5fb4).setOrigin(0);
```
With:
```javascript
    this.add.rectangle(25, 37, 210, 14, 0x222233).setOrigin(0);
    this.playerHPBar = this.add.rectangle(25, 37, 210, 14, pDef.color).setOrigin(0);
```

Replace:
```javascript
    this.add.text(875, 18, 'RAMPAGE', {
      fontSize: '13px', color: '#dd4444', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.add.rectangle(875, 37, 210, 14, 0x222233).setOrigin(1, 0);
    this.aiHPBar = this.add.rectangle(875, 37, 210, 14, 0xaa1111).setOrigin(1, 0);
```
With:
```javascript
    this.add.text(875, 18, aDef.name, {
      fontSize: '13px', color: aColorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.add.rectangle(875, 37, 210, 14, 0x222233).setOrigin(1, 0);
    this.aiHPBar = this.add.rectangle(875, 37, 210, 14, aDef.color).setOrigin(1, 0);
```

**Step 5: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add scenes/BattleScene.js scenes/UIScene.js && git commit -m "feat: BattleScene and UIScene accept dynamic bot selection from roster"
```

---

### Task 7: Wire everything in index.html and game.js

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Step 1: Replace index.html script tags**

The new load order (BotRoster must come after WedgeBot files, before scenes):

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
  <script src="data/BotRoster.js"></script>
  <script src="ai/BotAI.js"></script>
  <script src="scenes/MainMenuScene.js"></script>
  <script src="scenes/ModeSelectScene.js"></script>
  <script src="scenes/BotSelectScene.js"></script>
  <script src="scenes/GarageScene.js"></script>
  <script src="scenes/UIScene.js"></script>
  <script src="scenes/BattleScene.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

**Step 2: Update game.js scene list**

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
  scene: [MainMenuScene, ModeSelectScene, BotSelectScene, GarageScene, BattleScene, UIScene]
};

window.game = new Phaser.Game(config);
```

**Step 3: Commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add index.html game.js && git commit -m "feat: wire all new scenes into index.html and game.js"
```

---

### Task 8: Verify end-to-end

**Step 1:** Open `index.html` in browser
**Step 2:** Confirm MainMenuScene shows PLAY and GARAGE buttons
**Step 3:** Click GARAGE → see both bot cards with stats, click BACK returns to main
**Step 4:** Click PLAY → ModeSelectScene, click 1v1 vs AI → BotSelectScene
**Step 5:** Click a bot card → it highlights, FIGHT! button activates
**Step 6:** Click FIGHT! → BattleScene starts with chosen bot, HUD shows correct name/color
**Step 7:** Win or lose → MainMenuScene shows last match result
**Step 8:** Click PLAY again → BotSelectScene (no selection remembered), pick different bot, verify AI gets the other bot

**Step 9: Final commit**
```bash
cd /c/Users/godda/Documents/battlebots && git add . && git commit -m "feat: complete menus and garage — MainMenu, ModeSelect, BotSelect, Garage"
```
