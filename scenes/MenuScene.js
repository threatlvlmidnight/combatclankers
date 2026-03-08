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
    btn.on('pointerdown', () => this.scene.start('PreBattleLoadingScene'));

    // Controls hint
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
