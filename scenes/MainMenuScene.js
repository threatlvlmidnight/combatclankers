// scenes/MainMenuScene.js
const GAME_VERSION = 'v0.2.6';

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

    this.add.text(cx, 610, `${GAME_VERSION}  ·  See version change to verify live updates`, {
      fontSize: '10px', color: '#445566', fontFamily: 'monospace'
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
