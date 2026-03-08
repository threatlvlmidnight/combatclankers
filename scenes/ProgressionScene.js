// scenes/ProgressionScene.js
// Player progression and bot part unlock interface

class ProgressionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ProgressionScene' });
  }

  init(data) {
    this.playerProgress = data?.progress || PlayerStorage.loadPlayer(data?.playerName || 'Player');
  }

  create() {
    this.drawBackground();

    const padding = 30;
    const x = padding;
    const y = padding;

    // Title
    this.add.text(x, y, 'PROGRESSION & UNLOCKS', {
      fontSize: '32px', color: '#ff9900', fontFamily: 'monospace', fontStyle: 'bold'
    });

    // Left side: Player stats
    this.drawPlayerStats(x, y + 60);

    // Right side: Unlocked parts and next rewards
    this.drawUnlockedParts(450, y + 60);

    // Bottom: Bot customizations
    this.drawBotCustomizations(x, 380);

    // Back button
    this.makeBackButton(800, 620);
  }

  drawPlayerStats(x, y) {
    const stats = this.playerProgress.getStats();
    const achievements = Leaderboard.getPlayerAchievements(this.playerProgress);

    // Player name
    this.add.text(x, y, `PLAYER: ${this.playerProgress.playerName}`, {
      fontSize: '16px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold'
    });

    // Rank
    this.add.text(x, y + 35, `RANK: ${stats.rank}`, {
      fontSize: '20px', color: '#00ff00', fontFamily: 'monospace', fontStyle: 'bold'
    });

    // Experience bar
    const nextExp = stats.nextLevelExp;
    const expPercent = (stats.experience % nextExp) / nextExp;
    this.add.rectangle(x, y + 65, 150, 12, 0x111111).setOrigin(0, 0);
    this.add.rectangle(x, y + 65, 150 * expPercent, 12, 0x4a9fd4).setOrigin(0, 0);
    const currentExp = stats.experience % nextExp;
    this.add.text(x + 75, y + 68, `EXP: ${currentExp}/${nextExp}`, {
      fontSize: '10px', color: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Match stats
    let statY = y + 95;
    this.add.text(x, statY, `Matches: ${stats.totalMatches}`, { fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace' });
    statY += 22;
    this.add.text(x, statY, `Wins: ${stats.wins}`, { fontSize: '12px', color: '#00ff00', fontFamily: 'monospace' });
    statY += 18;
    this.add.text(x, statY, `Losses: ${stats.losses}`, { fontSize: '12px', color: '#ff4444', fontFamily: 'monospace' });
    statY += 22;
    this.add.text(x, statY, `Win Rate: ${stats.winRate}%`, { fontSize: '12px', color: '#ffcc00', fontFamily: 'monospace' });
    statY += 22;
    this.add.text(x, statY, `Streak: ${stats.winStreak} (Max: ${this.playerProgress.maxWinStreak})`, {
      fontSize: '12px', color: '#ff9900', fontFamily: 'monospace'
    });

    // Achievements
    statY += 32;
    this.add.text(x, statY, 'ACHIEVEMENTS:', { fontSize: '12px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold' });
    statY += 18;
    if (achievements.length === 0) {
      this.add.text(x, statY, 'Keep winning to unlock!', { fontSize: '10px', color: '#666666', fontFamily: 'monospace' });
    } else {
      achievements.forEach((ach, index) => {
        this.add.text(x, statY + index * 16, `✓ ${ach.name}`, { fontSize: '10px', color: '#00ff00', fontFamily: 'monospace' });
      });
    }
  }

  drawUnlockedParts(x, y) {
    this.add.text(x, y, 'UNLOCKED PARTS', {
      fontSize: '16px', color: '#ff3300', fontFamily: 'monospace', fontStyle: 'bold'
    });

    const parts = Array.from(this.playerProgress.unlockedParts).sort();
    const partDescriptions = {
      'armor_basic': 'Basic Armor',
      'armor_light': 'Light Armor Plating',
      'armor_heavy': 'Heavy Armor',
      'armor_reinforced': 'Reinforced Plating',
      'weapon_basic': 'Standard Weapon',
      'weapon_damage': 'Damage Upgrade',
      'weapon_precision': 'Precision Targeting',
      'weapon_efficiency': 'Efficiency Mod',
      'chassis_4wheel': '4-Wheel Chassis',
      'chassis_2wheel': '2-Wheel Speedster',
      'chassis_8wheel': '8-Wheel Tank',
      'turbo_speed': 'Speed Boost',
      'turbo_acceleration': 'Acceleration'
    };

    const colors = {
      'armor': '#4a9fd4',
      'weapon': '#ff3300',
      'chassis': '#00ff00',
      'turbo': '#ffcc00'
    };

    let partY = y + 30;
    parts.forEach(part => {
      const desc = partDescriptions[part] || part;
      const color = colors[part.split('_')[0]] || '#aaaaaa';
      this.add.text(x, partY, `• ${desc}`, { fontSize: '11px', color, fontFamily: 'monospace' });
      partY += 18;
    });

    // Next unlock prediction
    partY += 12;
    const nextRankExp = PlayerProgress.getExpForRank(this.playerProgress.rank + 1);
    this.add.text(x, partY, `Next unlock at Rank ${this.playerProgress.rank + 1}`, {
      fontSize: '10px', color: '#999999', fontFamily: 'monospace', fontStyle: 'italic'
    });
  }

  drawBotCustomizations(x, y) {
    this.add.text(x, y, 'BOT CUSTOMIZATIONS', {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
    });

    let customY = y + 28;
    let botCount = 0;
    for (const botKey in this.playerProgress.botCustomizations) {
      const custom = this.playerProgress.botCustomizations[botKey];
      const bot = BOT_ROSTER.find(b => b.key === botKey);
      if (bot) {
        const armorText = '▓'.repeat(custom.armorLevel) + '░'.repeat(5 - custom.armorLevel);
        const weaponText = '▓'.repeat(custom.weaponLevel) + '░'.repeat(5 - custom.weaponLevel);
        this.add.text(x, customY, `${bot.name}  Armor:${armorText} Weapon:${weaponText}`, {
          fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace'
        });
        customY += 18;
        botCount++;
        if (botCount >= 3) break;  // Show first 3 bots
      }
    }
    if (botCount === 3) {
      this.add.text(x, customY, `...and ${Object.keys(this.playerProgress.botCustomizations).length - 3} more bots`, {
        fontSize: '10px', color: '#666666', fontFamily: 'monospace'
      });
    }
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
