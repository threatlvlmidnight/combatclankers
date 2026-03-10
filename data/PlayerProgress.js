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
    try {
      if (!this.unlockedParts) this.unlockedParts = new Set();
      if (!(this.unlockedParts instanceof Set)) this.unlockedParts = new Set(this.unlockedParts);
      
      const rewardPool = [
        'armor_light', 'armor_heavy', 'armor_reinforced',
        'weapon_damage', 'weapon_precision', 'weapon_efficiency',
        'chassis_2wheel', 'chassis_8wheel',
        'turbo_speed', 'turbo_acceleration'
      ];

      const newReward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
      if (newReward) {
        this.unlockedParts.add(newReward);
        console.log(`[PlayerProgress] Rank ${this.rank}: Unlocked ${newReward}`);
      }
    } catch (e) {
      console.error('[PlayerProgress] Error granting rank rewards:', e);
    }
  }

  recordMatch(won, opponentName = 'AI', reason = 'knockout') {
    try {
      this.totalMatches = (this.totalMatches || 0) + 1;
      if (won) {
        this.wins = (this.wins || 0) + 1;
        this.winStreak = (this.winStreak || 0) + 1;
        this.maxWinStreak = Math.max(this.maxWinStreak || 0, this.winStreak);
        this.addExperience(150);
      } else {
        this.losses = (this.losses || 0) + 1;
        this.winStreak = 0;
        this.addExperience(50);
      }
      console.log(`[PlayerProgress] Match recorded: ${this.playerName} - Won: ${won}, Total: ${this.totalMatches}`);
      this.lastUpdated = new Date().toISOString();
    } catch (e) {
      console.error('[PlayerProgress] Error in recordMatch():', e);
    }
  }

  getWinRate() {
    return this.totalMatches === 0 ? 0 : (this.wins / this.totalMatches * 100).toFixed(1);
  }

  unlockPart(partKey) {
    try {
      if (!this.unlockedParts) this.unlockedParts = new Set();
      if (!(this.unlockedParts instanceof Set)) this.unlockedParts = new Set(this.unlockedParts);
      this.unlockedParts.add(partKey);
      this.lastUpdated = new Date().toISOString();
    } catch (e) {
      console.error('[PlayerProgress] Error unlocking part:', e);
    }
  }

  isPartUnlocked(partKey) {
    try {
      if (!this.unlockedParts) return false;
      if (!(this.unlockedParts instanceof Set)) this.unlockedParts = new Set(this.unlockedParts);
      return this.unlockedParts.has(partKey);
    } catch (e) {
      console.error('[PlayerProgress] Error checking if part is unlocked:', e);
      return false;
    }
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
    try {
      const unlockedCount = this.unlockedParts && this.unlockedParts.size ? this.unlockedParts.size : 0;
      return {
        rank: this.rank || 1,
        experience: this.experience || 0,
        nextLevelExp: PlayerProgress.getExpForRank((this.rank || 1) + 1),
        totalMatches: this.totalMatches || 0,
        wins: this.wins || 0,
        losses: this.losses || 0,
        winRate: this.getWinRate(),
        winStreak: this.winStreak || 0,
        maxWinStreak: this.maxWinStreak || 0,
        unlockedParts: unlockedCount
      };
    } catch (e) {
      console.error('Error in getStats():', e);
      return {
        rank: 1, experience: 0, nextLevelExp: 100,
        totalMatches: 0, wins: 0, losses: 0, winRate: 0,
        winStreak: 0, maxWinStreak: 0, unlockedParts: 3
      };
    }
  }

  toJSON() {
    try {
      const partsList = this.unlockedParts instanceof Set 
        ? Array.from(this.unlockedParts) 
        : Array.isArray(this.unlockedParts) 
          ? this.unlockedParts 
          : ['armor_basic', 'weapon_basic', 'chassis_4wheel'];
      
      return {
        playerName: this.playerName || 'Player',
        rank: this.rank || 1,
        experience: this.experience || 0,
        totalMatches: this.totalMatches || 0,
        wins: this.wins || 0,
        losses: this.losses || 0,
        winStreak: this.winStreak || 0,
        maxWinStreak: this.maxWinStreak || 0,
        unlockedParts: partsList,
        botCustomizations: this.botCustomizations || {},
        createdAt: this.createdAt || new Date().toISOString(),
        lastUpdated: this.lastUpdated || new Date().toISOString()
      };
    } catch (e) {
      console.error('[PlayerProgress] Error serializing to JSON:', e);
      return {
        playerName: 'Player', rank: 1, experience: 0, totalMatches: 0,
        wins: 0, losses: 0, winStreak: 0, maxWinStreak: 0,
        unlockedParts: ['armor_basic', 'weapon_basic', 'chassis_4wheel'],
        botCustomizations: {},
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  static fromJSON(data) {
    try {
      const progress = new PlayerProgress(data?.playerName || 'Player');
      progress.rank = data?.rank || 1;
      progress.experience = data?.experience || 0;
      progress.totalMatches = data?.totalMatches || 0;
      progress.wins = data?.wins || 0;
      progress.losses = data?.losses || 0;
      progress.winStreak = data?.winStreak || 0;
      progress.maxWinStreak = data?.maxWinStreak || 0;
      
      // Ensure unlockedParts is a Set
      if (data?.unlockedParts) {
        if (Array.isArray(data.unlockedParts)) {
          progress.unlockedParts = new Set(data.unlockedParts);
        } else if (data.unlockedParts instanceof Set) {
          progress.unlockedParts = data.unlockedParts;
        }
      }
      
      progress.botCustomizations = data?.botCustomizations || {};
      progress.createdAt = data?.createdAt || new Date().toISOString();
      progress.lastUpdated = data?.lastUpdated || new Date().toISOString();
      return progress;
    } catch (e) {
      console.error('[PlayerProgress] Error deserializing from JSON:', e);
      return new PlayerProgress('Player');
    }
  }
}
