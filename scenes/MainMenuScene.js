// scenes/MainMenuScene.js
const GAME_VERSION = 'v0.3.5';

class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  init(data) {
    this.resultData = data?.result || null;
    this.playerProgress = null;
  }

  create() {
    console.log('[MainMenuScene] create() called, resultData:', this.resultData);
    const cx = 450;
    this.drawBackground();

    try {
      // Load player progress
      this.playerProgress = PlayerStorage.loadPlayer();
      console.log('[MainMenuScene] Player progress loaded:', this.playerProgress?.playerName, 'Rank:', this.playerProgress?.rank);

      // Handle match result if this is a return from battle
      if (this.resultData) {
        console.log('[MainMenuScene] Processing match result:', this.resultData);
        const isPlayerWin = this.resultData.winner === 'Player';
        console.log('[MainMenuScene] Player won:', isPlayerWin);
        PlayerStorage.recordMatchResult(this.playerProgress, isPlayerWin, this.resultData.aiBotName, this.resultData.reason);
        console.log('[MainMenuScene] Match recorded');
        this.playerProgress = PlayerStorage.loadPlayer();
        console.log('[MainMenuScene] Progress reloaded after match');
      }
    } catch (e) {
      console.error('Error loading player progress:', e);
      this.playerProgress = this.playerProgress || new PlayerProgress('Player');
    }

    // Title
    this.add.text(cx, 100, 'COMBAT', {
      fontSize: '80px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 185, 'CLANKERS', {
      fontSize: '64px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 265, 'A  R  E  N  A', {
      fontSize: '18px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Player status bar
    try { this.drawPlayerStatus(cx, 318); } catch (e) { console.error('drawPlayerStatus error:', e); }

    // Last match result
    if (this.resultData) {
      try {
        const isPlayerWin = this.resultData.winner === 'Player';
        const winColor = isPlayerWin ? '#4a9fd4' : '#dd4444';
        const winName = isPlayerWin
          ? (this.resultData.playerBotName || 'You')
          : (this.resultData.aiBotName || 'AI');
        const reasons = { pit: 'pit KO!', disable: 'disabled!', time: "judges' decision!" };
        this.add.text(cx, 348, `Last match: ${winName} won — ${reasons[this.resultData.reason] || ''}`, {
          fontSize: '14px', color: winColor, fontFamily: 'monospace'
        }).setOrigin(0.5);
      } catch (e) { console.error('Result display error:', e); }
    }

    const btnY = this.resultData ? 385 : 360;
    this.makeButton(cx, btnY, 'PLAY', 0xcc2200, 0xff4400, () => {
      try {
        this.scene.start('ModeSelectScene');
      } catch (e) {
        console.error('Error transitioning to ModeSelectScene:', e);
      }
    });
    this.makeButton(cx, btnY + 60, 'GARAGE', 0x1a3a5a, 0x2255aa, () => {
      try {
        this.scene.start('GarageScene');
      } catch (e) {
        console.error('Error transitioning to GarageScene:', e);
      }
    });
    this.makeButton(cx - 130, btnY + 120, 'PROGRESSION', 0x2a3a1a, 0x44aa00, () => {
      try {
        console.log('[MainMenuScene] Starting ProgressionScene with progress:', this.playerProgress);
        this.scene.start('ProgressionScene', { progress: this.playerProgress });
      } catch (e) {
        console.error('Error transitioning to ProgressionScene:', e);
      }
    });
    this.makeButton(cx + 130, btnY + 120, 'LEADERBOARD', 0x1a2a4a, 0x0055ff, () => {
      try {
        console.log('[MainMenuScene] Starting LeaderboardScene for player:', this.playerProgress?.playerName);
        this.scene.start('LeaderboardScene', { playerName: this.playerProgress?.playerName || 'Player' });
      } catch (e) {
        console.error('Error transitioning to LeaderboardScene:', e);
      }
    });

    this.add.text(cx, 610, `${GAME_VERSION}  ·  See version change to verify live updates`, {
      fontSize: '10px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  drawPlayerStatus(x, y) {
    try {
      if (!this.playerProgress) {
        console.warn('[MainMenuScene] playerProgress not available');
        return;
      }
      const stats = this.playerProgress.getStats();
      const color = stats.rank >= 10 ? '#ffcc00' : stats.rank >= 5 ? '#4a9fd4' : '#aaaaaa';
      this.add.text(x, y, `Rank ${stats.rank}  •  ${stats.wins}W-${stats.losses}L  •  ${stats.winRate}%`, {
        fontSize: '12px', color, fontFamily: 'monospace'
      }).setOrigin(0.5);
    } catch (e) {
      console.error('[MainMenuScene] Error drawing player status:', e);
    }
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
