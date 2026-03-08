// scenes/LeaderboardScene.js
// Global leaderboard display

class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data) {
    this.playerName = data?.playerName || 'Player';
  }

  create() {
    this.drawBackground();

    const cx = 450;
    const topY = 30;

    // Title
    this.add.text(cx, topY, 'LEADERBOARD', {
      fontSize: '40px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Global stats
    this.drawGlobalStats(cx, topY + 55);

    // Leaderboard table
    this.drawLeaderboardTable(cx, 130);

    // Player context (if exists)
    this.drawPlayerContext(cx, 500);

    // Back button
    this.makeBackButton(800, 620);
  }

  drawGlobalStats(x, y) {
    const globalStats = Leaderboard.getGlobalStats();
    const statText = `${globalStats.totalPlayers} Players  •  ${globalStats.totalMatches} Matches  •  Avg Win Rate: ${globalStats.averageWinRate}%  •  Top Rank: ${globalStats.topRank}`;
    this.add.text(x, y, statText, {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5);
  }

  drawLeaderboardTable(cx, startY) {
    const topPlayers = Leaderboard.getFormattedLeaderboard(10);

    // Header
    const header = [
      { text: '#', x: cx - 330, width: 30 },
      { text: 'PLAYER', x: cx - 290, width: 120 },
      { text: 'RANK', x: cx - 160, width: 50 },
      { text: 'WINS', x: cx - 100, width: 50 },
      { text: 'LOSSES', x: cx - 30, width: 60 },
      { text: 'W/L %', x: cx + 50, width: 60 },
      { text: 'STREAK', x: cx + 120, width: 60 }
    ];

    header.forEach(col => {
      this.add.text(col.x, startY, col.text, {
        fontSize: '12px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
      });
    });

    // Rows
    topPlayers.forEach((player, index) => {
      const rowY = startY + 25 + index * 22;
      const isCurrentPlayer = player.playerName === this.playerName;
      const color = isCurrentPlayer ? '#4a9fd4' : '#aaaaaa';
      const highlight = isCurrentPlayer ? 0x1a2a3a : 0x000000;

      // Highlight current player
      if (isCurrentPlayer) {
        this.add.rectangle(cx - 350, rowY, 420, 20, highlight).setOrigin(0);
      }

      const cols = [
        { text: player.position, x: cx - 330 },
        { text: player.playerName.substring(0, 15), x: cx - 290 },
        { text: player.rank, x: cx - 160 },
        { text: player.wins, x: cx - 100 },
        { text: player.losses, x: cx - 30 },
        { text: player.winRate.toFixed(1) + '%', x: cx + 50 },
        { text: player.maxWinStreak, x: cx + 120 }
      ];

      cols.forEach(col => {
        this.add.text(col.x, rowY, col.text, {
          fontSize: '11px', color, fontFamily: 'monospace'
        });
      });
    });
  }

  drawPlayerContext(cx, startY) {
    const context = Leaderboard.getPlayerContext(this.playerName, 1);
    if (!context) return;

    this.add.text(cx, startY, `YOUR RANK: #${context.playerRank} of ${context.totalPlayers}`, {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    let y = startY + 30;
    context.context.forEach(player => {
      const color = player.isCurrentPlayer ? '#00ff00' : '#aaaaaa';
      const marker = player.isCurrentPlayer ? '>>> ' : '    ';
      this.add.text(cx - 150, y, `${marker}#${player.position} ${player.playerName}`, {
        fontSize: '11px', color, fontFamily: 'monospace'
      });
      this.add.text(cx + 80, y, `Lvl ${player.rank} | ${player.wins}W-${player.losses}L`, {
        fontSize: '11px', color, fontFamily: 'monospace'
      });
      y += 18;
    });
  }

  makeBackButton(x, y) {
    const btn = this.add.rectangle(x, y, 70, 35, 0x333333).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, 'BACK', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(0x555555); txt.setColor('#ffcc00'); });
    btn.on('pointerout', () => { btn.setFillStyle(0x333333); txt.setColor('#ffffff'); });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  drawBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, 900, 650);
    bg.lineStyle(1, 0x111133, 0.5);
    for (let x = 0; x < 900; x += 55) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, 650); bg.strokePath();
    }
    for (let y = 0; y < 650; y += 55) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(900, y); bg.strokePath();
    }
  }
}
