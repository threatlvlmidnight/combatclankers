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
