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

    // 1v1 Online — active
    this.makeMode(450, 410,
      '1v1 Online', 'Internet · Two Players',
      0x1a1a3a, 0x3333aa,
      () => this.scene.start('OnlineLobbyScene')
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
