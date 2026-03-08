# Menus & Garage Design

**Date:** 2026-03-08

## Navigation Flow

```
MainMenuScene
├── PLAY  →  ModeSelectScene
│               └── 1v1 vs AI  →  BotSelectScene
│                                   └── [Pick bot]  →  BattleScene
└── GARAGE  →  GarageScene
                └── [Browse bots, read-only]  →  back to MainMenu
```

After battle ends → back to MainMenuScene (with last result shown).

## New Files

| File | Purpose |
|---|---|
| `data/BotRoster.js` | Central bot definitions shared by all scenes |
| `scenes/MainMenuScene.js` | Root menu — Play, Garage buttons |
| `scenes/ModeSelectScene.js` | Game mode selection (1v1 Local for now) |
| `scenes/BotSelectScene.js` | Player picks their bot before a match |
| `scenes/GarageScene.js` | Browse bot roster, view stats (read-only) |

## Modified Files

| File | Change |
|---|---|
| `index.html` | Add new scene scripts |
| `game.js` | Register new scenes, remove old MenuScene |
| `scenes/BattleScene.js` | Accept `playerBotKey` from scene data, remove hardcoded WedgeBot1 |
| `scenes/MenuScene.js` | Replaced entirely by MainMenuScene |

## BotRoster.js

Array of bot definition objects:
```javascript
const BOT_ROSTER = [
  {
    key: 'crusher',
    name: 'CRUSHER',
    class: WedgeBot1,  // constructor reference
    color: 0x1a5fb4,
    wedgeColor: 0x4a9fd4,
    weapon: 'Wedge',
    description: 'Classic wedge. Low damage, high control.',
    stats: { speed: 85, armor: 70, weapon: 20 }
  },
  {
    key: 'rampage',
    name: 'RAMPAGE',
    class: WedgeBot2,
    color: 0xaa1111,
    wedgeColor: 0xdd4444,
    weapon: 'Wedge',
    description: 'Aggressive wedge. Slightly slower but armored.',
    stats: { speed: 75, armor: 80, weapon: 20 }
  }
];
```

## BotCard Component (shared visual)

Both GarageScene and BotSelectScene render bot cards:
- Colored rectangle preview (rendered via Bot.createTexture or a static draw)
- Bot name (monospace, bot color)
- Weapon type
- Stat bars: Speed / Armor / Weapon (out of 100)
- Short description
- In BotSelectScene: clickable, highlights selected card

## MainMenuScene

Replaces current MenuScene. Same visual style (dark background, grid, big title). Buttons:
- **PLAY** — navigates to ModeSelectScene
- **GARAGE** — navigates to GarageScene
- Last match result shown if coming back from battle

## ModeSelectScene

Simple screen:
- Title: "SELECT MODE"
- One button for now: **1v1 vs AI** → goes to BotSelectScene
- Back button → MainMenuScene

## BotSelectScene

- Title: "CHOOSE YOUR BOT"
- Bot cards laid out horizontally (2 cards for now, expands as roster grows)
- Hover highlight, click to select
- Selected card glows / shows "SELECTED" badge
- **FIGHT!** button (disabled until a bot is selected)
- AI bot is randomly assigned from roster (excluding player's pick)
- Passes `{ playerBotKey, aiBotKey }` to BattleScene

## GarageScene

- Title: "GARAGE"
- Same card layout as BotSelectScene but non-interactive (no click to select)
- Stat bars visible on each card
- Back button → MainMenuScene

## BattleScene Changes

`create()` receives `data` from scene.start:
```javascript
init(data) {
  this.playerBotKey = data?.playerBotKey || 'crusher';
  this.aiBotKey = data?.aiBotKey || 'rampage';
}
```
`createBots()` looks up constructors from BOT_ROSTER by key.

Post-game navigates to MainMenuScene (not old MenuScene).

## Roadmap (not in scope now)
- [ ] Custom bot builder in Garage
- [ ] Online bot select (both players pick simultaneously)
- [ ] 2v2 mode select
