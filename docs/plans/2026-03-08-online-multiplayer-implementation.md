# Online Multiplayer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add internet 1v1 multiplayer via PeerJS — host generates a room code, client joins by entering it, host-authoritative physics synced at 20 Hz.

**Architecture:** PeerJS (WebRTC P2P) loaded from CDN. Host runs the full simulation for both bots; client sends WASD inputs each frame; host sends full game state at 20 Hz. A global `NET` singleton (PeerNet.js) manages the connection. `BattleScene` branches on `isOnline`/`isHost` flags.

**Tech Stack:** Phaser 3.60, PeerJS 1.5.x CDN, vanilla JS, no build tools.

---

### Task 1: Add PeerJS CDN and create PeerNet wrapper

**Files:**
- Modify: `index.html`
- Create: `net/PeerNet.js`

**Step 1: Add PeerJS CDN to index.html**

In `index.html`, add the PeerJS script tag right after the Phaser script tag (before any game scripts):

```html
  <script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"></script>
```

**Step 2: Create net/PeerNet.js**

```javascript
// net/PeerNet.js
// Thin PeerJS wrapper. One peer, one connection at a time.
// Use the global NET singleton throughout the app.
class PeerNet {
  constructor() {
    this.peer = null;
    this.conn = null;
    this._onMessage = null;
    this._onClose = null;
  }

  // HOST: call this to wait for one incoming connection.
  // onConn(conn) fires when a peer connects.
  initHost(onConn) {
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.peer.on('connection', conn => {
        this.conn = conn;
        this._setupConn(conn);
        onConn(conn);
      });
    });
    this.peer.on('error', err => console.error('[PeerNet] error:', err));
  }

  // CLIENT: connect to hostId, onOpen() fires when the data channel is ready.
  connect(hostId, onOpen) {
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.conn = this.peer.connect(hostId, { reliable: true });
      this._setupConn(this.conn);
      this.conn.on('open', onOpen);
    });
    this.peer.on('error', err => console.error('[PeerNet] error:', err));
  }

  _setupConn(conn) {
    conn.on('data', data => this._onMessage && this._onMessage(data));
    conn.on('close', () => this._onClose && this._onClose());
  }

  onMessage(cb) { this._onMessage = cb; }
  onClose(cb) { this._onClose = cb; }

  send(data) {
    if (this.conn && this.conn.open) this.conn.send(data);
  }

  getPeerId() {
    return this.peer ? this.peer.id : null;
  }

  destroy() {
    if (this.conn) { try { this.conn.close(); } catch(e){} }
    if (this.peer) { try { this.peer.destroy(); } catch(e){} }
    this.peer = null;
    this.conn = null;
  }
}

const NET = new PeerNet();
```

**Step 3: Commit**
```bash
git add index.html net/PeerNet.js && git commit -m "feat: add PeerJS CDN and PeerNet wrapper"
```

---

### Task 2: Create OnlineLobbyScene

**Files:**
- Create: `scenes/OnlineLobbyScene.js`

**Step 1: Create the file**

Host clicks HOST → PeerJS initializes and assigns a peer ID displayed as the room code. Client clicks JOIN → enters the code in a DOM input → connects. Both are forwarded to `OnlineBotSelectScene` once connected.

```javascript
// scenes/OnlineLobbyScene.js
class OnlineLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OnlineLobbyScene' });
  }

  create() {
    this.inputEl = null;
    this.drawBackground();

    this.add.text(450, 85, '1v1 ONLINE', {
      fontSize: '44px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 140, 'Play against a friend over the internet', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.makeButton(230, 300, 'HOST', 0x1a3a5a, 0x2255aa, () => this.startHost());
    this.makeButton(670, 300, 'JOIN', 0x1a3a1a, 0x33aa33, () => this.showJoinUI());

    this.roomCodeText = this.add.text(450, 390, '', {
      fontSize: '22px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statusText = this.add.text(450, 430, '', {
      fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5);

    this.events.once('shutdown', () => this.cleanup());
    this.makeBackButton(() => { this.cleanup(); NET.destroy(); this.scene.start('ModeSelectScene'); });
  }

  startHost() {
    this.statusText.setText('Initializing...');
    NET.destroy();
    NET.initHost(() => {
      this.statusText.setText('Opponent connected!\nHeading to bot select...');
      this.time.delayedCall(800, () => this.scene.start('OnlineBotSelectScene', { isHost: true }));
    });

    // Poll until PeerJS assigns an ID
    const poll = setInterval(() => {
      const id = NET.getPeerId();
      if (id) {
        clearInterval(poll);
        this.roomCodeText.setText(id);
        this.statusText.setText('Share this code with your opponent.\nWaiting for them to join...');
      }
    }, 200);
  }

  showJoinUI() {
    if (this.inputEl) return; // already shown

    // Create a DOM input overlay on top of the canvas
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / this.game.config.width;
    const sy = rect.height / this.game.config.height;

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.placeholder = 'paste room code here';
    Object.assign(this.inputEl.style, {
      position: 'fixed',
      left: `${rect.left + 300 * sx}px`,
      top: `${rect.top + 360 * sy}px`,
      width: `${300 * sx}px`,
      background: '#111122',
      color: '#ffffff',
      border: '1px solid #334455',
      padding: '10px',
      fontSize: `${16 * Math.min(sx, sy)}px`,
      fontFamily: 'monospace',
      textAlign: 'center',
      outline: 'none',
      zIndex: '100'
    });
    document.body.appendChild(this.inputEl);
    this.inputEl.focus();

    this.makeButton(450, 450, 'CONNECT', 0x3a1a1a, 0xaa3333, () => {
      const code = this.inputEl?.value.trim() || '';
      if (!code) { this.statusText.setText('Enter a room code first.'); return; }
      this.doJoin(code);
    });
  }

  doJoin(code) {
    this.statusText.setText('Connecting...');
    NET.destroy();
    NET.connect(code, () => {
      this.statusText.setText('Connected! Heading to bot select...');
      this.time.delayedCall(600, () => this.scene.start('OnlineBotSelectScene', { isHost: false }));
    });
  }

  cleanup() {
    if (this.inputEl) { this.inputEl.remove(); this.inputEl = null; }
  }

  makeButton(x, y, label, color, hoverColor, onClick) {
    const btn = this.add.rectangle(x, y, 220, 52, color).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(hoverColor); txt.setColor('#ffcc00'); });
    btn.on('pointerout', () => { btn.setFillStyle(color); txt.setColor('#ffffff'); });
    btn.on('pointerdown', onClick);
    return btn;
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
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
git add scenes/OnlineLobbyScene.js && git commit -m "feat: add OnlineLobbyScene with Host/Join and PeerJS room code"
```

---

### Task 3: Create OnlineBotSelectScene

**Files:**
- Create: `scenes/OnlineBotSelectScene.js`

**Step 1: Create the file**

Both players pick their bot. Client sends `{type:'hello', botKey}` on pick. Host waits for both selections; FIGHT! button activates when both are ready. Host sends `{type:'start', playerBotKey, aiBotKey}` and both navigate to BattleScene.

```javascript
// scenes/OnlineBotSelectScene.js
class OnlineBotSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OnlineBotSelectScene' });
  }

  init(data) {
    this.isHost = data.isHost;
    this.selectedKey = null;
    this.opponentKey = null;
    this.cards = [];
  }

  create() {
    this.drawBackground();

    const roleLabel = this.isHost ? '[HOST]' : '[GUEST]';
    this.add.text(450, 40, `CHOOSE YOUR BOT  ${roleLabel}`, {
      fontSize: '30px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 80, 'Click a bot to select it', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const total = BOT_ROSTER.length;
    const spacing = 340;
    const startX = 450 - ((total - 1) * spacing) / 2;
    BOT_ROSTER.forEach((botDef, i) => this.createBotCard(startX + i * spacing, 310, botDef));

    this.statusText = this.add.text(450, 558, '', {
      fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5);

    this.fightBg = this.add.rectangle(450, 600, 240, 52, 0x333333);
    this.fightTxt = this.add.text(450, 600, 'FIGHT!', {
      fontSize: '24px', color: '#666666', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Network message handler
    NET.onMessage(msg => {
      if (this.isHost && msg.type === 'hello') {
        this.opponentKey = msg.botKey;
        this.statusText.setText('Opponent picked their bot!');
        if (this.selectedKey) this.enableFight();
      } else if (!this.isHost && msg.type === 'start') {
        this.scene.start('BattleScene', {
          playerBotKey: msg.playerBotKey,
          aiBotKey: msg.aiBotKey,
          isOnline: true,
          isHost: false
        });
      }
    });

    this.makeBackButton(() => { NET.destroy(); this.scene.start('OnlineLobbyScene'); });
  }

  createBotCard(x, y, botDef) {
    const cw = 300, ch = 330;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    const card = this.add.rectangle(x, y, cw, ch, 0x111122)
      .setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.4);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

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

    card.on('pointerover', () => { if (this.selectedKey !== botDef.key) card.setFillStyle(0x1a1a33); });
    card.on('pointerout', () => { if (this.selectedKey !== botDef.key) card.setFillStyle(0x111122); });
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
        border.clear(); border.lineStyle(3, botDef.color, 1.0);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      } else {
        card.setFillStyle(0x111122);
        border.clear(); border.lineStyle(2, botDef.color, 0.25);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      }
    });

    if (!this.isHost) {
      NET.send({ type: 'hello', botKey: key });
      this.statusText.setText('Waiting for host to start the match...');
    } else {
      this.statusText.setText(this.opponentKey
        ? 'Opponent ready — hit FIGHT! to start.'
        : 'Waiting for opponent to pick...');
      if (this.opponentKey) this.enableFight();
    }
  }

  enableFight() {
    this.fightBg.setFillStyle(0xcc2200).setInteractive({ useHandCursor: true });
    this.fightTxt.setColor('#ffffff');
    this.fightBg.removeAllListeners();
    this.fightBg.on('pointerover', () => this.fightBg.setFillStyle(0xff4400));
    this.fightBg.on('pointerout', () => this.fightBg.setFillStyle(0xcc2200));
    this.fightBg.on('pointerdown', () => this.startFight());
  }

  startFight() {
    if (!this.selectedKey || !this.opponentKey) return;
    NET.send({ type: 'start', playerBotKey: this.selectedKey, aiBotKey: this.opponentKey });
    this.scene.start('BattleScene', {
      playerBotKey: this.selectedKey,
      aiBotKey: this.opponentKey,
      isOnline: true,
      isHost: true
    });
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
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
git add scenes/OnlineBotSelectScene.js && git commit -m "feat: add OnlineBotSelectScene with hello/start handshake"
```

---

### Task 4: Enable "1v1 Online" in ModeSelectScene

**Files:**
- Modify: `scenes/ModeSelectScene.js`

**Step 1: Replace the "1v1 Online" makeMode call**

Find the "Online — coming soon" block in `create()` and replace it:

Replace:
```javascript
    // Online — coming soon (greyed, not interactive)
    this.makeMode(450, 410,
      '1v1 Online', 'Coming Soon',
      0x111111, 0x333333,
      null
    );
```

With:
```javascript
    // 1v1 Online — active
    this.makeMode(450, 410,
      '1v1 Online', 'Internet · Two Players',
      0x1a1a3a, 0x3333aa,
      () => this.scene.start('OnlineLobbyScene')
    );
```

**Step 2: Commit**
```bash
git add scenes/ModeSelectScene.js && git commit -m "feat: enable 1v1 Online button in ModeSelectScene"
```

---

### Task 5: Update BattleScene with online multiplayer mode

**Files:**
- Modify: `scenes/BattleScene.js`

This is the most significant change. BattleScene gets an online branch controlled by `isOnline` and `isHost` flags.

**Step 1: Extend init() to read online flags**

Replace:
```javascript
  init(data) {
    this.playerBotKey = data?.playerBotKey || 'crusher';
    this.aiBotKey = data?.aiBotKey || 'rampage';
  }
```

With:
```javascript
  init(data) {
    this.playerBotKey = data?.playerBotKey || 'crusher';
    this.aiBotKey = data?.aiBotKey || 'rampage';
    this.isOnline = data?.isOnline || false;
    this.isHost = data?.isHost || false;
    this._clientInput = { u: 0, d: 0, l: 0, r: 0 };
    this._stateTimer = 0;
  }
```

**Step 2: Add online NET setup at end of create()**

In `create()`, after `this.scene.launch('UIScene');`, add:

```javascript
    if (this.isOnline) {
      NET.onMessage(msg => this._onNetMessage(msg));
      NET.onClose(() => this._onDisconnect());
    }
```

**Step 3: Replace createBots() to skip BotAI in online mode**

Replace:
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

With:
```javascript
  createBots() {
    const playerDef = BOT_ROSTER.find(b => b.key === this.playerBotKey) || BOT_ROSTER[0];
    const aiDef = BOT_ROSTER.find(b => b.key === this.aiBotKey) || BOT_ROSTER[1] || BOT_ROSTER[0];
    this.playerBotDef = playerDef;
    this.aiBotDef = aiDef;
    this.playerBot = new playerDef.botClass(this, 150, 343);
    this.aiBot = new aiDef.botClass(this, 680, 200);
    if (!this.isOnline) {
      this.botAI = new BotAI(this.aiBot, this.playerBot, { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH });
    }
  }
```

**Step 4: Replace update() with online-aware version**

Replace the entire `update()` method:

```javascript
  update(time, delta) {
    if (this.gameOver) return;

    // Only host (or solo) owns the timer
    if (!this.isOnline || this.isHost) {
      this.matchTimer -= delta;
      if (this.matchTimer <= 0) { this.timeUp(); return; }
    }

    this.events.emit('timerUpdate', this.matchTimer);

    if (!this.isOnline) {
      this.updatePlayerMovement();
      this.botAI.update(delta);
    } else if (this.isHost) {
      this.updatePlayerMovement();
      this._applyClientInput();
      this._stateTimer += delta;
      if (this._stateTimer >= 50) { this._stateTimer = 0; this._sendState(); }
    } else {
      // Client: send inputs, zero velocities (host owns physics)
      this._sendInput();
      if (this.playerBot?.body) { this.playerBot.body.setVelocity(0, 0); this.playerBot.setAngularVelocity(0); }
      if (this.aiBot?.body) { this.aiBot.body.setVelocity(0, 0); this.aiBot.setAngularVelocity(0); }
    }
  }
```

**Step 5: Modify knockOut() to send go packet and clean up NET**

Replace the `this.time.delayedCall(3000, ...)` block inside `knockOut()`:
```javascript
    this.events.emit('gameOver', { winner, reason });

    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene', { result: { winner, reason, playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
    });
```

With:
```javascript
    this.events.emit('gameOver', { winner, reason });

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason });

    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      if (this.isOnline) NET.destroy();
      this.scene.start('MainMenuScene', { result: { winner, reason, playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
    });
```

**Step 6: Modify timeUp() similarly**

Replace the `this.time.delayedCall(3000, ...)` block inside `timeUp()`:
```javascript
    this.events.emit('gameOver', { winner, reason: 'time' });
    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene', { result: { winner, reason: 'time', playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
    });
```

With:
```javascript
    this.events.emit('gameOver', { winner, reason: 'time' });

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason: 'time' });

    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      if (this.isOnline) NET.destroy();
      this.scene.start('MainMenuScene', { result: { winner, reason: 'time', playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
    });
```

**Step 7: Add the new online helper methods to BattleScene**

Add these methods at the end of the class, before the closing `}`:

```javascript
  // HOST: apply stored client input to aiBot (mirrors updatePlayerMovement for the remote bot)
  _applyClientInput() {
    const bot = this.aiBot;
    const inp = this._clientInput;
    if (inp.l) bot.setAngularVelocity(-bot.rotationSpeed);
    else if (inp.r) bot.setAngularVelocity(bot.rotationSpeed);
    else bot.setAngularVelocity(0);
    if (inp.u) {
      bot.body.setVelocity(Math.cos(bot.rotation) * bot.botSpeed, Math.sin(bot.rotation) * bot.botSpeed);
    } else if (inp.d) {
      bot.body.setVelocity(-Math.cos(bot.rotation) * bot.botSpeed * 0.65, -Math.sin(bot.rotation) * bot.botSpeed * 0.65);
    } else {
      bot.body.setVelocity(bot.body.velocity.x * 0.87, bot.body.velocity.y * 0.87);
    }
  }

  // CLIENT: read local WASD and send as input packet
  _sendInput() {
    const k = this.keys;
    NET.send({ type: 'input', u: k.up.isDown?1:0, d: k.down.isDown?1:0, l: k.left.isDown?1:0, r: k.right.isDown?1:0 });
  }

  // HOST: send authoritative game state to client at 20 Hz
  _sendState() {
    NET.send({
      type: 'state',
      p: { x: this.playerBot.x, y: this.playerBot.y, rot: this.playerBot.rotation, hp: this.playerBot.hp, driveHP: this.playerBot.driveHP },
      a: { x: this.aiBot.x, y: this.aiBot.y, rot: this.aiBot.rotation, hp: this.aiBot.hp, driveHP: this.aiBot.driveHP },
      timer: this.matchTimer
    });
  }

  // Dispatch incoming network messages
  _onNetMessage(msg) {
    if (this.isHost) {
      if (msg.type === 'input') this._clientInput = msg;
    } else {
      if (msg.type === 'state') {
        this.playerBot.setPosition(msg.p.x, msg.p.y);
        this.playerBot.setRotation(msg.p.rot);
        this.playerBot.hp = msg.p.hp;
        this.playerBot.driveHP = msg.p.driveHP;
        this.aiBot.setPosition(msg.a.x, msg.a.y);
        this.aiBot.setRotation(msg.a.rot);
        this.aiBot.hp = msg.a.hp;
        this.aiBot.driveHP = msg.a.driveHP;
        this.matchTimer = msg.timer;
      } else if (msg.type === 'go') {
        this._onRemoteGameOver(msg);
      }
    }
  }

  // CLIENT: host signaled game over
  _onRemoteGameOver(msg) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.events.emit('gameOver', { winner: msg.winner, reason: msg.reason });
    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      NET.destroy();
      this.scene.start('MainMenuScene', { result: { winner: msg.winner, reason: msg.reason, playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
    });
  }

  // Peer disconnected mid-match
  _onDisconnect() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.events.emit('gameOver', { winner: 'Player', reason: 'disconnect' });
    this.time.delayedCall(2000, () => {
      this.scene.stop('UIScene');
      NET.destroy();
      this.scene.start('MainMenuScene', {});
    });
  }
```

**Step 8: Commit**
```bash
git add scenes/BattleScene.js && git commit -m "feat: BattleScene online multiplayer mode — host-authoritative state relay"
```

---

### Task 6: Add 'disconnect' reason to UIScene

**Files:**
- Modify: `scenes/UIScene.js`

**Step 1: Add disconnect to reasons map in showGameOver()**

In `showGameOver()`, find:
```javascript
    const reasons = {
      pit: `${loserName} fell into the pit!`,
      disable: `${loserName} was disabled!`,
      time: "Time's up — judges' decision!"
    };
```

Replace with:
```javascript
    const reasons = {
      pit: `${loserName} fell into the pit!`,
      disable: `${loserName} was disabled!`,
      time: "Time's up — judges' decision!",
      disconnect: 'Opponent disconnected.'
    };
```

**Step 2: Commit**
```bash
git add scenes/UIScene.js && git commit -m "feat: UIScene handles disconnect reason in game-over overlay"
```

---

### Task 7: Wire new files into index.html and game.js

**Files:**
- Modify: `index.html`
- Modify: `game.js`

**Step 1: Update index.html script block**

The full new script block (replace from Phaser CDN through game.js):

```html
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"></script>
  <script src="bots/Bot.js"></script>
  <script src="bots/WedgeBot1.js"></script>
  <script src="bots/WedgeBot2.js"></script>
  <script src="data/BotRoster.js"></script>
  <script src="net/PeerNet.js"></script>
  <script src="ai/BotAI.js"></script>
  <script src="scenes/MainMenuScene.js"></script>
  <script src="scenes/ModeSelectScene.js"></script>
  <script src="scenes/BotSelectScene.js"></script>
  <script src="scenes/GarageScene.js"></script>
  <script src="scenes/OnlineLobbyScene.js"></script>
  <script src="scenes/OnlineBotSelectScene.js"></script>
  <script src="scenes/UIScene.js"></script>
  <script src="scenes/BattleScene.js"></script>
  <script src="game.js"></script>
```

**Step 2: Update game.js scene list**

Replace:
```javascript
  scene: [MainMenuScene, ModeSelectScene, BotSelectScene, GarageScene, BattleScene, UIScene]
```

With:
```javascript
  scene: [MainMenuScene, ModeSelectScene, BotSelectScene, GarageScene, OnlineLobbyScene, OnlineBotSelectScene, BattleScene, UIScene]
```

**Step 3: Commit**
```bash
git add index.html game.js && git commit -m "feat: wire OnlineLobbyScene and OnlineBotSelectScene into index.html and game.js"
```

---

### Task 8: End-to-end verification

**Step 1: Open index.html in two browser tabs (or two machines)**

**Step 2: Tab 1 (Host)**
- Main Menu → PLAY → 1v1 Online → HOST
- Wait for room code to appear (e.g. `abc123def`)
- Copy the room code

**Step 3: Tab 2 (Client)**
- Main Menu → PLAY → 1v1 Online → JOIN
- Paste room code → CONNECT
- Both tabs should show "Heading to bot select..."

**Step 4: Bot select on both tabs**
- Both players pick different bots
- Host sees "Opponent picked their bot!" and FIGHT! activates
- Client sees "Waiting for host to start..."

**Step 5: Host clicks FIGHT!**
- Both tabs enter BattleScene
- Host controls left bot with WASD, client controls right bot with WASD
- Verify both bots move on both screens

**Step 6: Play out the match**
- Verify damage shows on both screens
- Verify timer counts down on both screens
- Win by pit or time — verify both screens show game-over overlay and return to MainMenuScene

**Step 7: Final commit**
```bash
git add . && git commit -m "feat: complete online multiplayer — PeerJS 1v1 host-authoritative"
```
