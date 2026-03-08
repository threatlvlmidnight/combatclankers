# Bug Fixes + Colosseum Arena Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 multiplayer/garage bugs and add a second arena map (Colosseum) with map selection.

**Architecture:** Bug fixes are isolated to individual files. The arena system adds `data/ArenaConfig.js` as a map registry, refactors `BattleScene.createArena()` into per-map builders, and adds `MapSelectScene` for online host map picking. Custom bot transfer sends `loadoutConfig` over PeerJS so opponents can instantiate custom bots they don't have locally.

**Tech Stack:** Phaser 3.60, vanilla JS, PeerJS, no build tools, no test framework (manual browser testing).

---

### Task 1: Fix copy button not showing on re-host

**Files:**
- Modify: `scenes/OnlineLobbyScene.js:7-10`

**Step 1: Add reset in create()**

In `OnlineLobbyScene.create()`, add `this._copyBtn = null;` at the top of the method, right after `this.inputEl = null;`:

```javascript
create() {
    this.inputEl = null;
    this._copyBtn = null;   // <-- add this line
    this.drawBackground();
```

**Step 2: Test manually**

1. Open game, go to 1v1 Online, click HOST
2. Wait for room code to appear — copy button should show
3. Click BACK, then HOST again
4. Copy button should appear again (previously it didn't)

**Step 3: Commit**

```bash
git add scenes/OnlineLobbyScene.js
git commit -m "fix: reset copy button state on re-host"
```

---

### Task 2: Fix custom bots not showing in Garage VIEW mode

**Files:**
- Modify: `scenes/GarageScene.js:60-82`

**Step 1: Add pagination to _renderViewMode**

Replace the current `_renderViewMode` method. The new version tracks `this._viewPage` and shows prev/next buttons when there are more than 6 bots:

```javascript
_renderViewMode() {
    this._uiContainer.removeAll(true);

    this._uiContainer.add(this.add.text(450, 80, 'BOT ROSTER', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const perPage = 6;
    if (this._viewPage === undefined) this._viewPage = 0;
    const maxPage = Math.max(0, Math.ceil(allBots.length / perPage) - 1);
    this._viewPage = Math.min(this._viewPage, maxPage);

    const start = this._viewPage * perPage;
    const pageBots = allBots.slice(start, start + perPage);

    const spacing = 280;
    const startY = 200;
    const startX = 450 - ((3 - 1) * spacing) / 2;

    pageBots.forEach((botDef, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = startX + col * spacing;
      const y = startY + row * 220;
      this._renderBotCard(x, y, botDef);
    });

    // Page indicator
    if (maxPage > 0) {
      this._uiContainer.add(this.add.text(450, 560, `Page ${this._viewPage + 1} / ${maxPage + 1}`, {
        fontSize: '12px', color: '#556677', fontFamily: 'monospace'
      }).setOrigin(0.5));
    }

    // Prev button
    if (this._viewPage > 0) {
      const prev = this.add.text(350, 560, '◄ PREV', {
        fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      prev.on('pointerover', () => prev.setColor('#ffffff'));
      prev.on('pointerout', () => prev.setColor('#aabbcc'));
      prev.on('pointerdown', () => { this._viewPage--; this._renderViewMode(); });
      this._uiContainer.add(prev);
    }

    // Next button
    if (this._viewPage < maxPage) {
      const next = this.add.text(550, 560, 'NEXT ►', {
        fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      next.on('pointerover', () => next.setColor('#ffffff'));
      next.on('pointerout', () => next.setColor('#aabbcc'));
      next.on('pointerdown', () => { this._viewPage++; this._renderViewMode(); });
      this._uiContainer.add(next);
    }
  }
```

**Step 2: Test manually**

1. Build a custom bot in the Garage BUILD tab
2. Switch to VIEW tab
3. Custom bot should now appear (page 2 if 6+ built-in bots exist, or on page 1 if fewer)
4. Prev/Next buttons navigate pages

**Step 3: Commit**

```bash
git add scenes/GarageScene.js
git commit -m "fix: add pagination to garage view so custom bots are visible"
```

---

### Task 3: Fix custom bots lost in online multiplayer

**Files:**
- Modify: `scenes/OnlineBotSelectScene.js:70-83,191-192,211-213`

**Step 1: Send loadoutConfig with hello message**

In `OnlineBotSelectScene.selectBot()`, find the line that sends the hello message (line 192). Change it to also send the loadoutConfig if the bot is custom:

```javascript
if (!this.isHost) {
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const botDef = allBots.find(b => b.key === key);
    const msg = { type: 'hello', botKey: key };
    if (botDef?.loadoutConfig) msg.loadoutConfig = botDef.loadoutConfig;
    NET.send(msg);
    this.statusText.setText('Waiting for host to start the match...');
}
```

**Step 2: Receive and register opponent's custom bot**

In the network message handler (line 70-83), when the host receives a `hello` with `loadoutConfig`, register a temporary roster entry:

```javascript
NET.onMessage(msg => {
    if (this.isHost && msg.type === 'hello') {
        this.opponentKey = msg.botKey;
        // Register opponent's custom bot if not already known
        if (msg.loadoutConfig) {
            const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
            if (!allBots.find(b => b.key === msg.botKey)) {
                const cfg = msg.loadoutConfig;
                CUSTOM_ROSTER.push({
                    key: cfg.key,
                    name: cfg.name,
                    botClass: CustomBot,
                    color: cfg.color,
                    weapon: cfg.weapon,
                    description: `${cfg.chassis} chassis\n${cfg.armor} armor`,
                    stats: CustomBot.computeDisplayStats(cfg),
                    loadoutConfig: cfg
                });
            }
        }
        this.statusText.setText('Opponent picked their bot!');
        if (this.selectedKey) this.enableFight();
    } else if (!this.isHost && msg.type === 'start') {
        // Register host's custom bot if included
        if (msg.loadoutConfig) {
            const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
            if (!allBots.find(b => b.key === msg.aiBotKey)) {
                const cfg = msg.loadoutConfig;
                CUSTOM_ROSTER.push({
                    key: cfg.key,
                    name: cfg.name,
                    botClass: CustomBot,
                    color: cfg.color,
                    weapon: cfg.weapon,
                    description: `${cfg.chassis} chassis\n${cfg.armor} armor`,
                    stats: CustomBot.computeDisplayStats(cfg),
                    loadoutConfig: cfg
                });
            }
        }
        this.scene.start('PreBattleLoadingScene', {
            playerBotKey: msg.playerBotKey,
            aiBotKey: msg.aiBotKey,
            isOnline: true,
            isHost: false
        });
    }
});
```

**Step 3: Send host's loadoutConfig with start message**

In `startFight()`, include the host's loadoutConfig if their bot is custom:

```javascript
startFight() {
    if (!this.selectedKey || !this.opponentKey) return;
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const myDef = allBots.find(b => b.key === this.selectedKey);
    const startMsg = { type: 'start', playerBotKey: this.selectedKey, aiBotKey: this.opponentKey };
    if (myDef?.loadoutConfig) startMsg.loadoutConfig = myDef.loadoutConfig;
    NET.send(startMsg);
    this.scene.start('PreBattleLoadingScene', {
        playerBotKey: this.selectedKey,
        aiBotKey: this.opponentKey,
        isOnline: true,
        isHost: true
    });
}
```

**Step 4: Test manually**

1. Player A builds a custom bot, hosts a game
2. Player B joins (has no custom bots)
3. Player A picks their custom bot, Player B picks any bot
4. Both should see the custom bot in battle (not a fallback default)
5. Test reverse: Player B picks custom bot, Player A hosts

**Step 5: Commit**

```bash
git add scenes/OnlineBotSelectScene.js
git commit -m "fix: send custom bot loadoutConfig over network so opponents can use it"
```

---

### Task 4: Create ArenaConfig.js

**Files:**
- Create: `data/ArenaConfig.js`
- Modify: `index.html` (add script tag)

**Step 1: Create the arena registry**

```javascript
// data/ArenaConfig.js
const ARENA_MAPS = {
  pitArena: {
    name: 'PIT ARENA',
    description: 'Corner pit hazard. Push your opponent in!',
    color: 0x880000,
    hasPit: true,
    arenaX: 35, arenaY: 78, arenaW: 830, arenaH: 530
  },
  colosseum: {
    name: 'COLOSSEUM',
    description: 'Open arena. No pit — pure combat.',
    color: 0xcc8800,
    hasPit: false,
    arenaX: 0, arenaY: 50, arenaW: 900, arenaH: 580
  }
};
```

**Step 2: Add script tag to index.html**

Add after `data/GameConfig.js` line:

```html
<script src="data/ArenaConfig.js?v=3"></script>
```

**Step 3: Commit**

```bash
git add data/ArenaConfig.js index.html
git commit -m "feat: add ArenaConfig with pitArena and colosseum definitions"
```

---

### Task 5: Refactor BattleScene.createArena() into per-map builders

**Files:**
- Modify: `scenes/BattleScene.js:9-11,22-23,80-133,148-150`

**Step 1: Read arenaKey in init()**

Add to `BattleScene.init()`:

```javascript
this.arenaKey = data?.arenaKey || 'pitArena';
```

**Step 2: Refactor createArena()**

Replace the current `createArena()` with a dispatcher that reads from `ARENA_MAPS`:

```javascript
createArena() {
    const map = ARENA_MAPS[this.arenaKey] || ARENA_MAPS.pitArena;
    this.arenaX = map.arenaX;
    this.arenaY = map.arenaY;
    this.arenaW = map.arenaW;
    this.arenaH = map.arenaH;
    this.hasPit = map.hasPit;

    const cx = this.arenaX + this.arenaW / 2;
    const cy = this.arenaY + this.arenaH / 2;
    const wallThick = 22;

    const g = this.add.graphics();

    if (this.arenaKey === 'colosseum') {
      this._drawColosseumFloor(g, cx, cy);
    } else {
      this._drawPitArenaFloor(g);
    }

    // Walls (shared by all arenas)
    const wallColor = this.arenaKey === 'colosseum' ? 0x887755 : 0x556677;
    this.walls = this.physics.add.staticGroup();

    const addWall = (wx, wy, ww, wh) => {
      const rect = this.add.rectangle(wx, wy, ww, wh, wallColor).setDepth(2);
      this.walls.add(rect);
      const hi = this.add.graphics().setDepth(3);
      hi.lineStyle(2, this.arenaKey === 'colosseum' ? 0xbbaa88 : 0x8899aa, 0.8);
      hi.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    };

    addWall(cx, this.arenaY + wallThick / 2, this.arenaW, wallThick);
    addWall(cx, this.arenaY + this.arenaH - wallThick / 2, this.arenaW, wallThick);
    addWall(this.arenaX + wallThick / 2, cy, wallThick, this.arenaH);
    addWall(this.arenaX + this.arenaW - wallThick / 2, cy, wallThick, this.arenaH);
    this.walls.refresh();

    this.physics.world.setBounds(
      this.arenaX + wallThick, this.arenaY + wallThick,
      this.arenaW - wallThick * 2, this.arenaH - wallThick * 2
    );

    // Pit (only for pitArena)
    if (this.hasPit) {
      this._buildPit(g, cx, cy, wallThick);
    }
  }
```

**Step 3: Extract pit arena floor drawing**

```javascript
_drawPitArenaFloor(g) {
    g.fillStyle(0x1e1e30, 1);
    g.fillRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);
    g.lineStyle(1, 0x2a2a50, 0.6);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaW; x += 55) {
      g.beginPath(); g.moveTo(x, this.arenaY); g.lineTo(x, this.arenaY + this.arenaH); g.strokePath();
    }
    for (let y = this.arenaY; y <= this.arenaY + this.arenaH; y += 55) {
      g.beginPath(); g.moveTo(this.arenaX, y); g.lineTo(this.arenaX + this.arenaW, y); g.strokePath();
    }
  }
```

**Step 4: Create colosseum floor drawing**

```javascript
_drawColosseumFloor(g, cx, cy) {
    // Stone-colored floor
    g.fillStyle(0x2a2218, 1);
    g.fillRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);

    // Subtle tile grid
    g.lineStyle(1, 0x3a3228, 0.5);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaW; x += 60) {
      g.beginPath(); g.moveTo(x, this.arenaY); g.lineTo(x, this.arenaY + this.arenaH); g.strokePath();
    }
    for (let y = this.arenaY; y <= this.arenaY + this.arenaH; y += 60) {
      g.beginPath(); g.moveTo(this.arenaX, y); g.lineTo(this.arenaX + this.arenaW, y); g.strokePath();
    }

    // Center circle marking
    g.lineStyle(3, 0x554422, 0.6);
    g.strokeCircle(cx, cy, 100);
    g.lineStyle(1, 0x554422, 0.3);
    g.strokeCircle(cx, cy, 50);

    // Center dot
    g.fillStyle(0x554422, 0.4);
    g.fillCircle(cx, cy, 6);

    // Arena name
    this.add.text(cx, this.arenaY + 38, 'COLOSSEUM', {
      fontSize: '14px', color: '#554422', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);
  }
```

**Step 5: Extract pit building**

Move the pit-specific code from the old `createArena()` into `_buildPit()`:

```javascript
_buildPit(g, cx, cy, wallThick) {
    const pitW = 130, pitH = 130;
    const pitX = this.arenaX + this.arenaW - wallThick - pitW / 2;
    const pitY = this.arenaY + this.arenaH - wallThick - pitH / 2;

    g.fillStyle(0x880000, 0.7);
    g.fillRect(pitX - pitW / 2 - 6, pitY - pitH / 2 - 6, pitW + 12, pitH + 12);
    g.fillStyle(0x000000, 1);
    g.fillRect(pitX - pitW / 2, pitY - pitH / 2, pitW, pitH);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff0000 : 0x000000, 0.25);
      g.fillRect(pitX - pitW / 2 + i * 16, pitY - pitH / 2, 16, pitH);
    }
    g.fillStyle(0x330000, 0.5);
    g.fillRect(pitX - pitW / 2 + 8, pitY - pitH / 2 + 8, pitW - 16, pitH - 16);

    this.add.text(pitX, pitY, 'PIT', {
      fontSize: '18px', color: '#ff3333', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);
    this.add.text(pitX - pitW / 2 - 30, pitY - pitH / 2 - 22, '▼►', {
      fontSize: '14px', color: '#ff4444', fontFamily: 'monospace'
    }).setDepth(1);

    this.pitZone = this.add.zone(pitX, pitY, pitW, pitH);
    this.physics.add.existing(this.pitZone, true);

    this.pitX = pitX;
    this.pitY = pitY;
    this.pitW = pitW;
    this.pitH = pitH;
  }
```

**Step 6: Guard pit overlap in setupPhysics()**

In `setupPhysics()`, wrap pit overlaps in a guard:

```javascript
setupPhysics() {
    this.physics.add.collider(this.playerBot, this.walls);
    this.physics.add.collider(this.aiBot, this.walls);
    this.physics.add.collider(this.playerBot, this.aiBot, this.handleBotCollision, null, this);
    if (this.hasPit && this.pitZone) {
      this.physics.add.overlap(this.playerBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.playerBot, 'pit'); });
      this.physics.add.overlap(this.aiBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.aiBot, 'pit'); });
    }
  }
```

**Step 7: Update BotAI construction to pass hasPit**

In `createBots()`, change the BotAI constructor call:

```javascript
if (!this.isOnline) {
    const pitInfo = this.hasPit ? { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH } : null;
    this.botAI = new BotAI(this.aiBot, this.playerBot, pitInfo);
}
```

Then in `ai/BotAI.js`, guard pit avoidance against null pit info. Find where `this.pit` is used and add `if (this.pit)` guards. The constructor already stores it as `this.pit = pitInfo`.

**Step 8: Test manually**

1. Play a solo match — should be the default pit arena (unchanged)
2. (Map selection not yet wired — will test colosseum after Task 7)

**Step 9: Commit**

```bash
git add scenes/BattleScene.js ai/BotAI.js
git commit -m "feat: refactor createArena into per-map builders, add colosseum floor"
```

---

### Task 6: Add map toggle to solo BotSelectScene

**Files:**
- Modify: `scenes/BotSelectScene.js`

**Step 1: Add arena selector**

After the bot cards and FIGHT button, add a map toggle at the bottom of the scene. In `create()`, after the existing fight button setup, add:

```javascript
// Map selector
this._selectedArena = 'pitArena';
const mapY = 570;
this.add.text(450, mapY - 20, 'ARENA', {
    fontSize: '11px', color: '#445566', fontFamily: 'monospace'
}).setOrigin(0.5);

const arenaKeys = Object.keys(ARENA_MAPS);
arenaKeys.forEach((key, i) => {
    const map = ARENA_MAPS[key];
    const bx = 450 + (i - (arenaKeys.length - 1) / 2) * 160;
    const btn = this.add.rectangle(bx, mapY, 140, 30, key === this._selectedArena ? 0x334455 : 0x111122)
        .setInteractive({ useHandCursor: true });
    const txt = this.add.text(bx, mapY, map.name, {
        fontSize: '11px', color: key === this._selectedArena ? '#ffffff' : '#556677', fontFamily: 'monospace'
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
        this._selectedArena = key;
        this.scene.restart(); // re-render with new selection
    });
});
```

**Step 2: Pass arenaKey when starting battle**

Find the FIGHT button handler that transitions to `PreBattleLoadingScene` and add `arenaKey: this._selectedArena` to the data object.

**Step 3: Test manually**

1. Go to solo Play, see arena toggle at bottom
2. Select COLOSSEUM, click FIGHT
3. Should load the colosseum arena (larger, no pit, stone floor)

**Step 4: Commit**

```bash
git add scenes/BotSelectScene.js
git commit -m "feat: add arena selector to solo bot select screen"
```

---

### Task 7: Pass arenaKey through PreBattleLoadingScene

**Files:**
- Modify: `scenes/PreBattleLoadingScene.js`

**Step 1: Forward arenaKey**

In `PreBattleLoadingScene.init()`, store `this.arenaKey = data?.arenaKey || 'pitArena'`.

In the transition to `BattleScene`, include `arenaKey: this.arenaKey` in the data.

**Step 2: Commit**

```bash
git add scenes/PreBattleLoadingScene.js
git commit -m "feat: forward arenaKey through PreBattleLoadingScene to BattleScene"
```

---

### Task 8: Create MapSelectScene for online host

**Files:**
- Create: `scenes/MapSelectScene.js`
- Modify: `index.html` (add script tag)
- Modify: `game.js` (add to scene list)
- Modify: `scenes/OnlineBotSelectScene.js` (transition to MapSelectScene instead of PreBattleLoadingScene)

**Step 1: Create MapSelectScene**

```javascript
// scenes/MapSelectScene.js
class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapSelectScene' });
  }

  init(data) {
    this.isHost = data.isHost;
    this.playerBotKey = data.playerBotKey;
    this.aiBotKey = data.aiBotKey;
    this._selectedArena = 'pitArena';
  }

  create() {
    this.drawBackground();

    this.add.text(450, 60, 'CHOOSE ARENA', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(450, 110, this.isHost ? 'Select a map for this match' : 'Waiting for host to pick a map...', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const arenaKeys = Object.keys(ARENA_MAPS);
    this._cards = [];

    arenaKeys.forEach((key, i) => {
      const map = ARENA_MAPS[key];
      const x = 450 + (i - (arenaKeys.length - 1) / 2) * 240;
      const y = 310;
      const cw = 200, ch = 240;
      const colorHex = '#' + map.color.toString(16).padStart(6, '0');

      const card = this.add.rectangle(x, y, cw, ch, key === this._selectedArena ? 0x223344 : 0x111122);
      const border = this.add.graphics();
      border.lineStyle(2, map.color, key === this._selectedArena ? 1.0 : 0.3);
      border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

      this.add.text(x, y - 80, map.name, {
        fontSize: '18px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);

      // Mini preview
      const pg = this.add.graphics();
      const pw = 140, ph = 80;
      const px = x - pw / 2, py = y - 50;
      pg.fillStyle(map.hasPit ? 0x1e1e30 : 0x2a2218, 1);
      pg.fillRect(px, py, pw, ph);
      pg.lineStyle(2, map.color, 0.5);
      pg.strokeRect(px, py, pw, ph);
      if (map.hasPit) {
        pg.fillStyle(0x000000, 1);
        pg.fillRect(px + pw - 30, py + ph - 30, 25, 25);
        pg.fillStyle(0xff0000, 0.3);
        pg.fillRect(px + pw - 30, py + ph - 30, 25, 25);
      } else {
        pg.lineStyle(1, 0x554422, 0.5);
        pg.strokeCircle(x, py + ph / 2, 20);
      }

      this.add.text(x, y + 50, map.description, {
        fontSize: '10px', color: '#667788', fontFamily: 'monospace',
        align: 'center', wordWrap: { width: 180 }
      }).setOrigin(0.5);

      if (this.isHost) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          this._selectedArena = key;
          this._cards.forEach(c => {
            const sel = c.key === key;
            c.card.setFillStyle(sel ? 0x223344 : 0x111122);
            c.border.clear();
            c.border.lineStyle(2, ARENA_MAPS[c.key].color, sel ? 1.0 : 0.3);
            c.border.strokeRect(c.x - cw / 2, c.y - ch / 2, cw, ch);
          });
        });
      }

      this._cards.push({ key, card, border, x, y });
    });

    // CONFIRM button (host only)
    if (this.isHost) {
      const confirmBg = this.add.rectangle(450, 500, 200, 48, 0xcc2200).setInteractive({ useHandCursor: true });
      const confirmTxt = this.add.text(450, 500, 'CONFIRM', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);
      confirmBg.on('pointerover', () => confirmBg.setFillStyle(0xff4400));
      confirmBg.on('pointerout', () => confirmBg.setFillStyle(0xcc2200));
      confirmBg.on('pointerdown', () => {
        NET.send({ type: 'mapSelect', arenaKey: this._selectedArena });
        this.scene.start('PreBattleLoadingScene', {
          playerBotKey: this.playerBotKey,
          aiBotKey: this.aiBotKey,
          arenaKey: this._selectedArena,
          isOnline: true,
          isHost: true
        });
      });
    }

    // Network handler (guest waits for host's map pick)
    NET.onMessage(msg => {
      if (!this.isHost && msg.type === 'mapSelect') {
        this.scene.start('PreBattleLoadingScene', {
          playerBotKey: this.playerBotKey,
          aiBotKey: this.aiBotKey,
          arenaKey: msg.arenaKey,
          isOnline: true,
          isHost: false
        });
      }
    });

    this.events.once('shutdown', () => NET.onMessage(null));
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

**Step 2: Add script tag and register scene**

In `index.html`, add after the OnlineBotSelectScene script tag:
```html
<script src="scenes/MapSelectScene.js?v=3"></script>
```

In `game.js`, add `MapSelectScene` to the scene array (after `OnlineBotSelectScene`).

**Step 3: Wire OnlineBotSelectScene to go to MapSelectScene**

In `OnlineBotSelectScene.startFight()`, instead of going directly to `PreBattleLoadingScene`, go to `MapSelectScene`:

```javascript
startFight() {
    if (!this.selectedKey || !this.opponentKey) return;
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const myDef = allBots.find(b => b.key === this.selectedKey);
    const startMsg = { type: 'start', playerBotKey: this.selectedKey, aiBotKey: this.opponentKey };
    if (myDef?.loadoutConfig) startMsg.loadoutConfig = myDef.loadoutConfig;
    NET.send(startMsg);
    this.scene.start('MapSelectScene', {
        isHost: true,
        playerBotKey: this.selectedKey,
        aiBotKey: this.opponentKey
    });
}
```

For the guest, when they receive `start` message, they also go to MapSelectScene:

```javascript
} else if (!this.isHost && msg.type === 'start') {
    // Register host's custom bot if included
    if (msg.loadoutConfig) {
        const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
        if (!allBots.find(b => b.key === msg.aiBotKey)) {
            const cfg = msg.loadoutConfig;
            CUSTOM_ROSTER.push({
                key: cfg.key, name: cfg.name, botClass: CustomBot,
                color: cfg.color, weapon: cfg.weapon,
                description: `${cfg.chassis} chassis\n${cfg.armor} armor`,
                stats: CustomBot.computeDisplayStats(cfg),
                loadoutConfig: cfg
            });
        }
    }
    this.scene.start('MapSelectScene', {
        isHost: false,
        playerBotKey: msg.playerBotKey,
        aiBotKey: msg.aiBotKey
    });
}
```

**Step 4: Test manually**

1. Host and join an online game
2. Both pick bots, host clicks FIGHT
3. Both should see MapSelectScene
4. Host picks an arena, clicks CONFIRM
5. Both transition to battle on the selected arena

**Step 5: Commit**

```bash
git add scenes/MapSelectScene.js scenes/OnlineBotSelectScene.js index.html game.js
git commit -m "feat: add MapSelectScene for online host arena selection"
```

---

### Task 9: Bump cache version and clean up debug logging

**Files:**
- Modify: `index.html` (bump ?v=3 to ?v=4)
- Modify: `scenes/BattleScene.js` (remove console.log debug lines)
- Modify: `scenes/UIScene.js` (remove console.log debug lines)
- Modify: `scenes/MainMenuScene.js` (remove console.log debug line)

**Step 1: Remove all `console.log('[BattleScene]` and `console.log('[UIScene]` and `console.log('[MainMenuScene]` debug lines**

Keep only `console.error` and `console.warn` lines. Remove the verbose debug logging added for the scene transition investigation.

**Step 2: Bump all `?v=3` to `?v=4` in index.html**

**Step 3: Commit**

```bash
git add index.html scenes/BattleScene.js scenes/UIScene.js scenes/MainMenuScene.js
git commit -m "chore: remove debug logging, bump cache version to v4"
```
