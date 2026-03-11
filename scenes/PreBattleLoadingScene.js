// scenes/PreBattleLoadingScene.js
// Pre-battle loading screen showing controls and bot matchup
class PreBattleLoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreBattleLoadingScene' });
  }

  init(data) {
    // For online matches, CLIENT needs to swap bot keys so it controls its own bot
    if (data?.isOnline && !data?.isHost) {
      // HOST sends: playerBotKey=host's, aiBotKey=client's
      // CLIENT should use: playerBotKey=client's, aiBotKey=host's
      this.playerBotKey = data.aiBotKey || 'rampage';
      this.aiBotKey = data.playerBotKey || 'crusher';
      console.log('[PreBattleLoadingScene] CLIENT swapped bot keys:', { playerBotKey: this.playerBotKey, aiBotKey: this.aiBotKey });
    } else {
      this.playerBotKey = data?.playerBotKey || 'crusher';
      this.aiBotKey = data?.aiBotKey || 'rampage';
    }
    this.isOnline = data?.isOnline || false;
    this.isHost = data?.isHost || false;
  }

  create() {
    const cx = 450;
    const cy = 325;

    // Background
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

    // Get bot definitions
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const playerDef = allBots.find(b => b.key === this.playerBotKey) || BOT_ROSTER[0];
    const aiDef = allBots.find(b => b.key === this.aiBotKey) || BOT_ROSTER[1] || BOT_ROSTER[0];

    // Title
    this.add.text(cx, 50, 'PREPARING FOR BATTLE', {
      fontSize: '32px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Bot matchup
    const playerColor = '#' + playerDef.color.toString(16).padStart(6, '0');
    const aiColor = '#' + aiDef.color.toString(16).padStart(6, '0');

    this.add.text(cx - 150, 120, playerDef.name, {
      fontSize: '20px', color: playerColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 120, 'VS', {
      fontSize: '16px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this.add.text(cx + 150, 120, aiDef.name, {
      fontSize: '20px', color: aiColor, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Control scheme box
    const boxTop = 170;
    const boxBg = this.add.rectangle(cx, boxTop + 110, 640, 220, 0x111122);
    const boxBorder = this.add.graphics();
    boxBorder.lineStyle(2, 0x445566, 0.6);
    boxBorder.strokeRect(cx - 320, boxTop, 640, 220);

    this.add.text(cx, boxTop + 15, 'CONTROLS', {
      fontSize: '18px', color: '#aabbcc', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Movement
    this.add.text(cx - 280, boxTop + 55, 'MOVEMENT:', {
      fontSize: '12px', color: '#667788', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(cx - 280, boxTop + 80, 'W / A / S / D  —  Forward • Turn • Reverse', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    // Weapon firing
    this.add.text(cx - 280, boxTop + 115, 'WEAPONS:', {
      fontSize: '12px', color: '#ffaa44', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.add.text(cx - 280, boxTop + 140, 'J  —  Primary Weapon  (Spinner, Hammer, Flipper, etc)', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);
    this.add.text(cx - 280, boxTop + 160, 'K  —  Secondary Weapon  (Hold for charge effects)', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);

    // Ready button
    const btnY = 520;
    const readyBtn = this.add.rectangle(cx - 130, btnY, 220, 52, 0xcc2200).setInteractive({ useHandCursor: true });
    const readyTxt = this.add.text(cx - 130, btnY, 'READY!', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    readyBtn.on('pointerover', () => { readyBtn.setFillStyle(0xff4400); readyTxt.setColor('#ffcc00'); });
    readyBtn.on('pointerout', () => { readyBtn.setFillStyle(0xcc2200); readyTxt.setColor('#ffffff'); });
    readyBtn.on('pointerdown', () => this.startBattle());

    // Or press spacebar
    this.add.text(cx, 600, 'Press SPACEBAR to start', {
      fontSize: '11px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Set up spacebar to start
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.startBattle());
  }

  startBattle() {
    this.scene.start('BattleScene', {
      playerBotKey: this.playerBotKey,
      aiBotKey: this.aiBotKey,
      isOnline: this.isOnline,
      isHost: this.isHost
    });
  }
}
