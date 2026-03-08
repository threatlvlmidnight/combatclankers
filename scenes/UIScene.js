class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.battleScene = this.scene.get('BattleScene');

    const pDef = this.battleScene.playerBotDef || BOT_ROSTER[0];
    const aDef = this.battleScene.aiBotDef || BOT_ROSTER[1] || BOT_ROSTER[0];
    const pColorHex = '#' + pDef.color.toString(16).padStart(6, '0');
    const aColorHex = '#' + aDef.color.toString(16).padStart(6, '0');

    // --- Player (left) ---
    this.add.text(25, 18, pDef.name, {
      fontSize: '13px', color: pColorHex, fontFamily: 'monospace', fontStyle: 'bold'
    });
    this.add.rectangle(25, 37, 210, 14, 0x222233).setOrigin(0);
    this.playerHPBar = this.add.rectangle(25, 37, 210, 14, pDef.color).setOrigin(0);
    this.add.text(25, 53, 'DRIVE', { fontSize: '9px', color: '#446655', fontFamily: 'monospace' });
    this.add.rectangle(25, 63, 210, 7, 0x111122).setOrigin(0);
    this.playerDriveBar = this.add.rectangle(25, 63, 210, 7, 0x22aa55).setOrigin(0);

    // --- AI (right) ---
    this.add.text(875, 18, aDef.name, {
      fontSize: '13px', color: aColorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(1, 0);
    this.add.rectangle(875, 37, 210, 14, 0x222233).setOrigin(1, 0);
    this.aiHPBar = this.add.rectangle(875, 37, 210, 14, aDef.color).setOrigin(1, 0);
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

    // Clean up listeners when this scene stops (prevents stale callbacks on replay)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.battleScene.events.off('timerUpdate', this.updateTimer, this);
      this.battleScene.events.off('gameOver', this.showGameOver, this);
    });
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
    const b = this.battleScene;
    const pDef = b.playerBotDef || BOT_ROSTER[0];
    const aDef = b.aiBotDef || BOT_ROSTER[1] || BOT_ROSTER[0];
    const winnerName = data.winner === 'Player' ? pDef.name : aDef.name;
    const loserDef = data.winner === 'Player' ? aDef : pDef;
    const winColor = data.winner === 'Player' ? ('#' + pDef.color.toString(16).padStart(6, '0')) : ('#' + aDef.color.toString(16).padStart(6, '0'));
    const loserName = loserDef.name.charAt(0) + loserDef.name.slice(1).toLowerCase();
    const reasons = {
      pit: `${loserName} fell into the pit!`,
      disable: `${loserName} was disabled!`,
      time: "Time's up — judges' decision!",
      disconnect: 'Opponent disconnected.'
    };

    this.gameOverBg.setVisible(true);
    this.gameOverText.setText(`${winnerName} WINS!`).setColor(winColor).setVisible(true);
    this.gameOverSub.setText(reasons[data.reason] || '').setVisible(true);
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
