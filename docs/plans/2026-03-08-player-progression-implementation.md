# Player Progression System - Implementation Guide

## Overview
A complete player progression system has been added to the BattleBots game, including:
- **Experience & Ranking** - Players earn experience and unlock ranks
- **Bot Part Unlocks** - Unlock armor, weapons, and chassis upgrades as you rank up
- **Player Progression Tracking** - Full match history and stats
- **Leaderboards** - Global rankings based on player performance
- **Data Persistence** - Player progress saved to browser localStorage

## Key Features

### 1. Player Progression

#### Experience & Rank System
- Players start at **Rank 1** with 0 experience
- Experience thresholds grow exponentially: `100 * rank * (rank + 1) / 2`
- Win a match: +150 XP
- Lose a match: +50 XP (no time wasted - you still progress!)
- Each rank-up grants a random bot part unlock

#### Rank Rewards
When you advance a rank, you automatically unlock one random part from:
- Armor: Light, Heavy, Reinforced plating
- Weapons: Damage boost, Precision targeting, Efficiency mods
- Chassis: 2-wheel speedster, 8-wheel tank
- Turbo: Speed boost, Acceleration mods

### 2. Bot Part Unlocks

#### Starting Parts
Every player begins with:
- Basic Armor
- Standard Weapon
- 4-Wheel Chassis (balanced)

#### Available Upgrades
**Armor Tiers:**
- Light (lighter weight, less protection)
- Heavy (more protection, slower)
- Reinforced (maximum protection)

**Weapon Upgrades:**
- Damage (more impact per hit)
- Precision Targeting (better accuracy)
- Efficiency (faster recharge)

**Chassis Options:**
- 2-Wheel Speedster (fast but fragile)
- 4-Wheel Balanced (default)
- 8-Wheel Tank (slow but stable)

**Turbos:**
- Speed boost (faster movement)
- Acceleration (better handling)

#### Using Unlocked Parts
Visit the **PROGRESSION** menu from the main menu to see all unlocked parts and see which bots have upgrades available.

### 3. Match Tracking

Players automatically track:
- **Total Matches** - Overall games played
- **Wins/Losses** - Win-loss record
- **Win Rate** - Percentage of wins
- **Win Streak** - Current consecutive wins (resets on loss)
- **Max Win Streak** - Best streak achieved

### 4. Leaderboards

#### Features
- **Global Rankings** - All players sorted by rank, then wins, then win rate
- **Player Context** - See your rank and nearby competitors
- **Global Stats** - Total players, total matches, average win rate
- **Achievement Tracking** - See progress toward achievements

#### Leaderboard Tiers
Access from main menu **LEADERBOARD** button:
- Top 10 players displayed
- Your current rank shown
- Context view shows 2 players above and below you

#### Achievements
Unlock achievements by:
- Reaching Rank 5+ (Novice)
- Reaching Rank 10+ (Fighter)
- Reaching Rank 15+ (Warrior)
- Reaching Rank 20+ (Champion)
- 5-win streak (Hot Streak)
- 10-win streak (Unstoppable)
- 10 wins (First Blood)
- 50 wins (Fifty Down)
- 100 wins (Centennial)
- 80% win rate with 10+ matches (Dominator)
- 70% win rate with 20+ matches (Consistent)
- 20 unlocked parts (Collector)

## Architecture

### Core Files

#### Data Layer (`data/`)

**PlayerProgress.js**
- Tracks all player data: rank, experience, wins, losses, unlocks
- Methods:
  - `addExperience(amount)` - Add XP and check for level up
  - `recordMatch(won, opponentName, reason)` - Record battle result
  - `unlockPart(partKey)` - Unlock a bot part
  - `upgradeBotArmor/Weapon(botKey)` - Upgrade specific bot

**PlayerStorage.js**
- Persists player data to localStorage
- Methods:
  - `loadPlayer(playerName)` - Load player progress
  - `savePlayer(progress)` - Save progress to storage
  - `recordMatchResult(progress, won, ...)` - Record match + update leaderboard
  - `getLeaderboard()` - Fetch leaderboard data
  - `getTopPlayers(limit)` - Get top N players
  - `clearAllData()` - Reset all data (for testing)

**Leaderboard.js**
- Manages leaderboard operations
- Methods:
  - `getFormattedLeaderboard(limit)` - Get display-ready leaderboard
  - `getPlayerContext(playerName, contextSize)` - Get player rank + neighbors
  - `getPlayerAchievements(progress)` - Get unlocked achievements
  - `getGlobalStats()` - Get global game statistics

#### Scene Layer (`scenes/`)

**ProgressionScene.js**
- Displays player progression UI
- Shows: rank, experience, match stats, achievements
- Lists all unlocked parts by category
- Shows bot customization levels

**LeaderboardScene.js**
- Displays global leaderboard
- Shows top 10 players with all stats
- Highlights current player's rank
- Shows context view with nearby competitors

#### Integration Points

**MainMenuScene.js** (Updated)
- Loads player progress on startup
- Records match results when returning from battle
- Displays player rank/stats in status bar
- Added "PROGRESSION" button → ProgressionScene
- Added "LEADERBOARD" button → LeaderboardScene

**BattleScene.js** (Integration ready)
- When `knockOut()` or `timeUp()` called:
  - Result is passed to MainMenuScene
  - `RecordMatchResult()` automatically called
  - Leaderboard updated

## Usage Examples

### Starting a New Game
```javascript
// Player created automatically with default name "Player"
// On first run, localStorage is empty:
let progress = PlayerStorage.loadPlayer("Player");
// Creates a fresh PlayerProgress with rank 1, 0 XP
```

### Recording a Match
```javascript
// When battle ends, MainMenuScene handles this:
const isPlayerWin = resultData.winner === 'Player';
PlayerStorage.recordMatchResult(playerProgress, isPlayerWin, opponentName, reason);
// Automatically:
// - Updates player wins/losses
// - Awards experience
// - Checks for rank up
// - Updates leaderboard
```

### Checking Leaderboard Position
```javascript
const topPlayers = Leaderboard.getFormattedLeaderboard(10);
// Returns top 10 with their stats for display

const context = Leaderboard.getPlayerContext("Player", 2);
// Returns your rank + 2 players above/below for context
```

### Unlocking a Part
```javascript
progress.unlockPart('armor_heavy');
PlayerStorage.savePlayer(progress);
// Part now appears in Progression UI
```

## Data Storage

### localStorage Keys
- **`battlebotsPlayerProgress_<playerName>`** - Individual player data (JSON)
- **`battlebotsLeaderboard`** - Global leaderboard (JSON array)

### Player Progress Structure
```javascript
{
  playerName: "Player",
  rank: 5,
  experience: 350,
  totalMatches: 12,
  wins: 8,
  losses: 4,
  winStreak: 2,
  maxWinStreak: 5,
  unlockedParts: ["armor_basic", "weapon_basic", "armor_light", ...],
  botCustomizations: {
    crusher: { armorLevel: 2, weaponLevel: 1, customColor: 0x1a5fb4 },
    ...
  },
  createdAt: "2026-03-08T...",
  lastUpdated: "2026-03-08T..."
}
```

### Leaderboard Entry Structure
```javascript
{
  playerName: "Player",
  rank: 5,
  wins: 8,
  losses: 4,
  winRate: 66.7,
  maxWinStreak: 5,
  lastUpdated: "2026-03-08T..."
}
```

## Future Enhancements

### Planned Features
1. **Seasonal Rankings** - Reset leaderboards monthly with rewards
2. **Tournament Mode** - Special ranked matches with higher XP
3. **Cosmetics** - Unlockable bot skins and decals
4. **Achievements UI** - In-game achievement notifications
5. **Trading** - Trade bot parts with other players
6. **Guilds** - Team-based leaderboards
7. **Cloud Sync** - Sync progress across devices
8. **Multiple Profiles** - Support multiple player profiles
9. **Prestige System** - Reset to ranked 1 with cosmetic rewards
10. **Daily Quests** - Special challenges for bonus XP

### Integration with Online Multiplayer
- Leaderboards will track cross-player matches
- Server-based progression for competitive play
- Anti-cheat measures for ranked matches
- Player reputation system

## Testing & Debugging

### Access Browser Console
Press `F12` in your browser to open developer console. Useful commands:

```javascript
// View current player progress
let p = PlayerStorage.loadPlayer();
console.log(p.getStats());

// View leaderboard
console.log(PlayerStorage.getLeaderboard());

// Simulate winning a match
let p = PlayerStorage.loadPlayer();
p.recordMatch(true, "TestBot", "pit");
PlayerStorage.savePlayer(p);

// Clear all data (to reset)
PlayerStorage.clearAllData();
```

### Manual Testing Checklist
- [ ] First launch shows Rank 1
- [ ] Win a match: gains 150 XP
- [ ] Lose a match: gains 50 XP
- [ ] After reaching threshold: rank increases
- [ ] PROGRESSION shows unlocked parts
- [ ] LEADERBOARD shows correct rankings
- [ ] Refresh page: data persists
- [ ] Multiple players: each has own entry
- [ ] Achievements unlock correctly

## Integration Checklist

✅ Data layer complete (PlayerProgress, PlayerStorage, Leaderboard)
✅ Scene layer complete (ProgressionScene, LeaderboardScene)
✅ MainMenuScene updated with progression UI
✅ Battle result integration ready
✅ localStorage persistence working
✅ Leaderboard sorting implemented
✅ Achievement system included

Ready to use!
