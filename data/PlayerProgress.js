// data/PlayerProgress.js
// Player progression system: experience, ranks, unlocked parts

class PlayerProgress {
  constructor(playerName = 'Player') {
    this.playerName = playerName;
    this.rank = 1;
    this.experience = 0;
    this.totalMatches = 0;
    this.wins = 0;
    this.losses = 0;
    this.winStreak = 0;
    this.maxWinStreak = 0;

    // Unlocked bot parts: armor plating, weapon upgrades, chassis upgrades
    this.unlockedParts = new Set([
      'armor_basic',      // Start with basic armor
      'weapon_basic',
      'chassis_4wheel'    // Start with 4-wheel chassis
    ]);

    // Bot customizations unlocked per bot
    this.botCustomizations = {};
    if (typeof BOT_ROSTER !== 'undefined' && BOT_ROSTER && BOT_ROSTER.length > 0) {
      BOT_ROSTER.forEach(bot => {
        this.botCustomizations[bot.key] = {
          armorLevel: 1,      // 1-5
          weaponLevel: 1,     // 1-5
          customColor: bot.color
        };
      });
    }

    this.createdAt = new Date().toISOString();
    this.lastUpdated = new Date().toISOString();
  }

  // Experience thresholds per rank (exponential growth)
  static getExpForRank(rank) {
    return 100 * rank * (rank + 1) / 2;
  }

  getRank() {
    return this.rank;
  }

  addExperience(amount) {
    this.experience += amount;
    this.checkLevelUp();
  }

  checkLevelUp() {
    const nextLevelExp = PlayerProgress.getExpForRank(this.rank + 1);
    while (this.experience >= nextLevelExp) {
      this.rank++;
      this._grantRankRewards();
    }
    this.lastUpdated = new Date().toISOString();
  }

  _grantRankRewards() {
    // Every rank gives armor or weapon unlock
    const rewardPool = [
      'armor_light', 'armor_heavy', 'armor_reinforced',
      'weapon_damage', 'weapon_precision', 'weapon_efficiency',
      'chassis_2wheel', 'chassis_8wheel',
      'turbo_speed', 'turbo_acceleration'
    ];

    const newReward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
    if (newReward) {
      this.unlockedParts.add(newReward);
    }
  }

  recordMatch(won, opponentName = 'AI', reason = 'knockout') {
    this.totalMatches++;
    if (won) {
      this.wins++;
      this.winStreak++;
      this.maxWinStreak = Math.max(this.maxWinStreak, this.winStreak);
      this.addExperience(150);  // Win grants more exp
    } else {
      this.losses++;
      this.winStreak = 0;
      this.addExperience(50);   // Loss grants minimal exp
    }
    this.lastUpdated = new Date().toISOString();
  }

  getWinRate() {
    return this.totalMatches === 0 ? 0 : (this.wins / this.totalMatches * 100).toFixed(1);
  }

  unlockPart(partKey) {
    this.unlockedParts.add(partKey);
    this.lastUpdated = new Date().toISOString();
  }

  isPartUnlocked(partKey) {
    return this.unlockedParts.has(partKey);
  }

  upgradeBotArmor(botKey) {
    if (this.botCustomizations[botKey]) {
      this.botCustomizations[botKey].armorLevel = Math.min(5, this.botCustomizations[botKey].armorLevel + 1);
      this.lastUpdated = new Date().toISOString();
      return true;
    }
    return false;
  }

  upgradeBotWeapon(botKey) {
    if (this.botCustomizations[botKey]) {
      this.botCustomizations[botKey].weaponLevel = Math.min(5, this.botCustomizations[botKey].weaponLevel + 1);
      this.lastUpdated = new Date().toISOString();
      return true;
    }
    return false;
  }

  setBotColor(botKey, colorHex) {
    if (this.botCustomizations[botKey]) {
      this.botCustomizations[botKey].customColor = colorHex;
      this.lastUpdated = new Date().toISOString();
    }
  }

  getStats() {
    return {
      rank: this.rank,
      experience: this.experience,
      nextLevelExp: PlayerProgress.getExpForRank(this.rank + 1),
      totalMatches: this.totalMatches,
      wins: this.wins,
      losses: this.losses,
      winRate: this.getWinRate(),
      winStreak: this.winStreak,
      maxWinStreak: this.maxWinStreak,
      unlockedParts: Array.from(this.unlockedParts).length,
      totalParts: Object.keys(this.unlockedParts).length
    };
  }

  toJSON() {
    return {
      playerName: this.playerName,
      rank: this.rank,
      experience: this.experience,
      totalMatches: this.totalMatches,
      wins: this.wins,
      losses: this.losses,
      winStreak: this.winStreak,
      maxWinStreak: this.maxWinStreak,
      unlockedParts: Array.from(this.unlockedParts),
      botCustomizations: this.botCustomizations,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  static fromJSON(data) {
    const progress = new PlayerProgress(data.playerName);
    progress.rank = data.rank;
    progress.experience = data.experience;
    progress.totalMatches = data.totalMatches;
    progress.wins = data.wins;
    progress.losses = data.losses;
    progress.winStreak = data.winStreak;
    progress.maxWinStreak = data.maxWinStreak;
    progress.unlockedParts = new Set(data.unlockedParts);
    progress.botCustomizations = data.botCustomizations;
    progress.createdAt = data.createdAt;
    progress.lastUpdated = data.lastUpdated;
    return progress;
  }
}
