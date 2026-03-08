# Bug Fixes + Colosseum Arena Design

## Bug Fixes

### 1a. Copy button not showing on re-host
`OnlineLobbyScene._copyBtn` is never reset between scene visits. The guard
`if (this._copyBtn) return` prevents re-creation on subsequent hosts.
**Fix:** Clear `this._copyBtn = null` in `create()`.

### 1b. Custom bots cut off in Garage VIEW mode
`allBots.slice(0, 6)` shows only the first 6 bots. The 6 built-in bots fill
all slots so custom bots never appear.
**Fix:** Add prev/next page buttons to paginate through all bots.

### 1c. Custom bots lost in online multiplayer
Only bot keys are sent over the network (`{ type: 'hello', botKey }`). The
opponent cannot resolve custom keys because they don't exist in their
localStorage.
**Fix:** Include `loadoutConfig` in the `hello` message when the selected bot
is custom. When the opponent receives a custom config, create a temporary
`CUSTOM_ROSTER` entry so `BattleScene.createBots()` can find it by key.

## Colosseum Arena

### Concept
Open arena with no pit. Larger than the Pit Arena. Win by disable or time
only. Pure combat focus.

### Arena Config
New file `data/ArenaConfig.js` with map registry:
- `pitArena` — existing arena (830x530, corner pit)
- `colosseum` — new arena (900x580, no pit, warm stone floor `0x2a2218`,
  circular center marking, thicker highlighted walls)

### BattleScene Changes
- `createArena()` dispatches to `_buildPitArena()` or `_buildColosseum()`
  based on `this.arenaKey`
- Pit overlap zone and pit-related logic skipped when arena has no pit
- `BotAI` receives `hasPit: false` so it skips pit avoidance pathfinding

## Map Selection

### Online Flow
New `MapSelectScene` shown to host after both players pick bots:
- Two arena cards side by side (PIT ARENA / COLOSSEUM)
- Host clicks one, hits CONFIRM
- Sends `{ type: 'mapSelect', arenaKey }` to opponent
- Both transition to `PreBattleLoadingScene` with `arenaKey`

### Solo Flow
`BotSelectScene` gets a small map toggle below the bot cards.
Defaults to `pitArena`.

### Data Flow
`BotSelectScene` / `OnlineBotSelectScene` -> `arenaKey` ->
`PreBattleLoadingScene` -> `arenaKey` -> `BattleScene.init()`
reads `this.arenaKey = data.arenaKey || 'pitArena'`
