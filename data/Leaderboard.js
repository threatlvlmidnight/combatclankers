// data/Leaderboard.js
// Leaderboard management - rankings, achievements, stats

class Leaderboard {
  static COLUMNS = {
    RANK: 'rank',
    PLAYER: 'player',
    LEVEL: 'level',
    WINS: 'wins',
    LOSSES: 'losses',
    STREAK: 'streak',
    WIN_RATE: 'winRate'
  };

  // Get formatted leaderboard data for display
  static getFormattedLeaderboard(limit = 10) {
    const leaderboard = PlayerStorage.getLeaderboard();
    return leaderboard.slice(0, limit).map((entry, index) => ({
      position: index + 1,
      playerName: entry.playerName,
      rank: entry.rank,
      wins: entry.wins,
      losses: entry.losses,
      winRate: entry.winRate,
      maxWinStreak: entry.maxWinStreak,
      lastUpdated: entry.lastUpdated
    }));
  }

  // Get player's rank position and nearby players
  static getPlayerContext(playerName, contextSize = 2) {
    const leaderboard = PlayerStorage.getLeaderboard();
    const playerIndex = leaderboard.findIndex(e => e.playerName === playerName);
    if (playerIndex === -1) return null;

    const start = Math.max(0, playerIndex - contextSize);
    const end = Math.min(leaderboard.length, playerIndex + contextSize + 1);

    return {
      playerRank: playerIndex + 1,
      totalPlayers: leaderboard.length,
      context: leaderboard.slice(start, end).map((entry, index) => ({
        position: start + index + 1,
        playerName: entry.playerName,
        rank: entry.rank,
        wins: entry.wins,
        losses: entry.losses,
        winRate: entry.winRate,
        isCurrentPlayer: entry.playerName === playerName
      }))
    };
  }

  // Get stats for a specific player
  static getPlayerStats(playerName) {
    const leaderboard = PlayerStorage.getLeaderboard();
    const entry = leaderboard.find(e => e.playerName === playerName);
    const position = leaderboard.findIndex(e => e.playerName === playerName) + 1;

    return entry ? { ...entry, position, totalPlayers: leaderboard.length } : null;
  }

  // Calculate player achievements/badges
  static getPlayerAchievements(progress) {
    const achievements = [];

    // Rank achievements
    if (progress.rank >= 5) achievements.push({ id: 'NOVICE', name: 'Novice', rank: 5 });
    if (progress.rank >= 10) achievements.push({ id: 'FIGHTER', name: 'Fighter', rank: 10 });
    if (progress.rank >= 15) achievements.push({ id: 'WARRIOR', name: 'Warrior', rank: 15 });
    if (progress.rank >= 20) achievements.push({ id: 'CHAMPION', name: 'Champion', rank: 20 });

    // Win streak achievements
    if (progress.maxWinStreak >= 5) achievements.push({ id: 'HOT_STREAK_5', name: 'Hot Streak', streak: 5 });
    if (progress.maxWinStreak >= 10) achievements.push({ id: 'UNSTOPPABLE', name: 'Unstoppable', streak: 10 });

    // Win count achievements
    if (progress.wins >= 10) achievements.push({ id: 'FIRST_10', name: 'First Blood', wins: 10 });
    if (progress.wins >= 50) achievements.push({ id: 'FIFTY_WINS', name: 'Fifty Down', wins: 50 });
    if (progress.wins >= 100) achievements.push({ id: 'CENTURY', name: 'Centennial', wins: 100 });

    // Win rate achievements
    const winRate = parseFloat(progress.getWinRate());
    if (progress.totalMatches >= 10 && winRate >= 80) achievements.push({ id: 'DOMINATOR', name: 'Dominator', winRate: 80 });
    if (progress.totalMatches >= 20 && winRate >= 70) achievements.push({ id: 'CONSISTENT', name: 'Consistent', winRate: 70 });

    // Parts unlocked
    if (progress.unlockedParts.size >= 20) achievements.push({ id: 'COLLECTOR', name: 'Collector', parts: 20 });

    return achievements;
  }

  // Compare two players
  static comparePlayersStats(playerName1, playerName2) {
    const progress1 = PlayerStorage.loadPlayer(playerName1);
    const progress2 = PlayerStorage.loadPlayer(playerName2);

    if (!progress1 || !progress2) return null;

    return {
      player1: {
        name: playerName1,
        rank: progress1.rank,
        wins: progress1.wins,
        losses: progress1.losses,
        winRate: progress1.getWinRate()
      },
      player2: {
        name: playerName2,
        rank: progress2.rank,
        wins: progress2.wins,
        losses: progress2.losses,
        winRate: progress2.getWinRate()
      }
    };
  }

  // Get global statistics
  static getGlobalStats() {
    const leaderboard = PlayerStorage.getLeaderboard();

    if (leaderboard.length === 0) {
      return {
        totalPlayers: 0,
        totalMatches: 0,
        averageWinRate: 0,
        topRank: 0
      };
    }

    const totalMatches = leaderboard.reduce((sum, e) => sum + e.wins + e.losses, 0);
    const avgWinRate = leaderboard.reduce((sum, e) => sum + e.winRate, 0) / leaderboard.length;
    const topRank = leaderboard[0].rank;

    return {
      totalPlayers: leaderboard.length,
      totalMatches,
      averageWinRate: avgWinRate.toFixed(1),
      topRank
    };
  }
}
