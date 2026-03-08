# BattleBots Game — PoC Design Doc
**Date:** 2026-03-07

## Overview
A browser-based BattleBots-inspired arena game. Players build or select robots and battle in the BattleBox. The PoC establishes a playable 1v1 arena with two wedge bots, driving controls, physics, a central pit, and a simple AI opponent.

## Stack
| Layer | Tech |
|---|---|
| Game engine | Phaser.js v3 |
| Physics | Arcade Physics (PoC) → Matter.js (roadmap) |
| Language | JavaScript, no build tools |
| Delivery | index.html + JS files, open in browser |
| Multiplayer (roadmap) | Node.js + Socket.io |

## File Structure
```
battlebots/
├── index.html
├── game.js
├── scenes/
│   ├── MenuScene.js
│   ├── BattleScene.js
│   └── UIScene.js
├── bots/
│   ├── Bot.js
│   ├── WedgeBot1.js   (Crusher - player bot)
│   └── WedgeBot2.js   (Rampage - AI bot)
├── ai/
│   └── BotAI.js
└── assets/
```

## Arena
- Isometric-style top-down perspective (angled tile grid)
- Rectangular BattleBox with solid walls
- Central pit — bots pushed in are instantly KO'd
- No other hazards in PoC

## Bots (PoC)
Both bots are passive wedge designs. Two pre-built bots:
- **Crusher** — Player-controlled wedge bot
- **Rampage** — AI-controlled wedge bot

### Bot Stats
| Stat | Description |
|---|---|
| Overall HP | General body health (100 HP) |
| Drive system HP | Wheels/treads — damage reduces speed |
| Weapon system HP | Passive wedge — stubbed for future |
| Armor zones | Front/sides/rear with damage multipliers |

Rear armor is weakest. Frontal wedge deflects some damage.

## Controls
- `WASD` — Move / strafe
- `J` / `Space` — Primary fire (stubbed)
- `K` / `Shift` — Secondary fire (stubbed)

## Win Conditions
1. **Disable** — Reduce opponent overall HP to 0, or destroy their drive system
2. **Pit KO** — Push opponent into the central pit (instant win)
3. **Timer** — 3-minute match; higher HP wins if time expires

## AI (BotAI.js)
Simple state machine:
- **Chase** — Move toward player
- **Ram** — Align wedge and accelerate into player
- **Evade** — Back off briefly after taking heavy damage

## Combat
- Damage on collision, scaled by relative velocity (ramming speed matters)
- Wedge angle: hitting opponent's flat side with your wedge = you control them
- Weakpoint system stubbed: drive/weapon components have their own HP pools

## Roadmap (Post-PoC)
- [ ] Matter.js physics upgrade (realistic spinner/flipper interactions)
- [ ] Weapon system: spinners, flippers, hammers, drums
- [ ] Bot builder: chassis + weapon + upgrade slot
- [ ] Online 1v1 multiplayer (Socket.io)
- [ ] Local 2v2 and tournament bracket
- [ ] More arenas with hazards (pulverizers, saws, screws)
- [ ] Iconic BattleBots roster (Tombstone, Minotaur, Witch Doctor, etc.)
