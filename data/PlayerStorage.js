// data/PlayerStorage.js
// Persistence layer for player progress data using localStorage

class PlayerStorage {
  static STORAGE_KEY = 'battlebotsPlayerProgress';
  static LEADERBOARD_KEY = 'battlebotsLeaderboard';

  // Load player progress - creates new if doesn't exist
  static loadPlayer(playerName = 'Player') {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${playerName}`);
      if (data) {
        return PlayerProgress.fromJSON(JSON.parse(data));
      }
    } catch (e) {
      console.error('Error loading player progress:', e);
    }
    return new PlayerProgress(playerName);
  }

  // Save player progress to localStorage
  static savePlayer(progress) {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${progress.playerName}`,
        JSON.stringify(progress.toJSON())
      );
      return true;
    } catch (e) {
      console.error('Error saving player progress:', e);
      return false;
    }
  }

  // Get all player names that have progress saved
  static getAllPlayerNames() {
    const names = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY + '_')) {
          const playerName = key.replace(this.STORAGE_KEY + '_', '');
          names.push(playerName);
        }
      }
    } catch (e) {
      console.error('Error getting player names:', e);
    }
    return names;
  }

  // Delete player progress
  static deletePlayer(playerName) {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${playerName}`);
      return true;
    } catch (e) {
      console.error('Error deleting player progress:', e);
      return false;
    }
  }

  // Record a match result and update leaderboard
  static recordMatchResult(progress, won, opponentName = 'AI', reason = 'knockout') {
    if (!progress) {
      console.warn('recordMatchResult called with null/undefined progress');
      return false;
    }
    try {
      progress.recordMatch(won, opponentName, reason);
      this.savePlayer(progress);
      this.updateLeaderboard(progress);
      console.log('[PlayerStorage] Match recorded for', progress.playerName, '- Won:', won);
      return true;
    } catch (e) {
      console.error('Error recording match result:', e);
      return false;
    }
  }

  // Update leaderboard with player stats
  static updateLeaderboard(progress) {
    try {
      const leaderboard = this.getLeaderboard();

      // Find or create entry for this player
      let entry = leaderboard.find(e => e.playerName === progress.playerName);
      if (!entry) {
        entry = {
          playerName: progress.playerName,
          rank: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          maxWinStreak: 0,
          lastUpdated: new Date().toISOString()
        };
        leaderboard.push(entry);
      }

      // Update entry
      entry.rank = progress.rank;
      entry.wins = progress.wins;
      entry.losses = progress.losses;
      entry.winRate = parseFloat(progress.getWinRate());
      entry.maxWinStreak = progress.maxWinStreak;
      entry.lastUpdated = new Date().toISOString();

      // Sort by rank (desc), then wins (desc), then winRate (desc)
      leaderboard.sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
      });

      localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(leaderboard));
      return true;
    } catch (e) {
      console.error('Error updating leaderboard:', e);
      return false;
    }
  }

  // Get current leaderboard
  static getLeaderboard() {
    try {
      const data = localStorage.getItem(this.LEADERBOARD_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    }
    return [];
  }

  // Get player rank on leaderboard
  static getPlayerRank(playerName) {
    const leaderboard = this.getLeaderboard();
    return leaderboard.findIndex(e => e.playerName === playerName) + 1 || 0;
  }

  // Get top N players
  static getTopPlayers(limit = 10) {
    return this.getLeaderboard().slice(0, limit);
  }

  // Clear all data (for testing/reset)
  static clearAllData() {
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(this.STORAGE_KEY) || key === this.LEADERBOARD_KEY)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (e) {
      console.error('Error clearing data:', e);
      return false;
    }
  }
}
