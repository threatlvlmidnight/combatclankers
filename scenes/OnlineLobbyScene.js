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
    this._poll = setInterval(() => {
      const id = NET.getPeerId();
      if (id) {
        clearInterval(this._poll);
        this._poll = null;
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
    if (this._poll) { clearInterval(this._poll); this._poll = null; }
    if (this.inputEl) { this.inputEl.remove(); this.inputEl = null; }
    this.time.removeAllEvents();
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
