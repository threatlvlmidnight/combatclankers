# Online Multiplayer Design — PeerJS 1v1

**Date:** 2026-03-08
**Status:** Approved

---

## Goal

Add internet-capable 1v1 multiplayer via PeerJS (WebRTC P2P). Host generates a room code; client enters it to join. No server required beyond PeerJS's free public signaling server.

---

## Architecture

### Transport
PeerJS CDN (`peerjs@1.5.x`) loaded via `<script>` tag. Wraps WebRTC data channels. PeerJS handles NAT traversal and signaling; after handshake, data flows P2P.

### Authority Model — Host-Authoritative State Relay
- **Host** runs the full Phaser arcade physics simulation for **both** bots.
- **Client** reads local WASD inputs and sends them to host every frame.
- **Host** applies the received inputs to the client's bot, steps physics, and sends full game state to client at **20 Hz**.
- **Client** applies received state directly to both bot sprites (position, rotation, hp, driveHP).
- No BotAI is used in online mode.

Trade-off: client's own bot has ~1 round-trip of input lag. Acceptable for a PoC; can be improved later with client-side prediction.

### Room Code
PeerJS assigns a peer ID to the host. We use it directly as the room code (e.g. `abc123def`). Host displays it; client pastes/types it into a text input in OnlineLobbyScene.

---

## Scene Flow

```
ModeSelectScene
  └─ "1v1 Online" (now active) → OnlineLobbyScene
       ├─ HOST button:
       │    PeerJS.init() → display room code → "Waiting for opponent..."
       │    On connection received → both transition to OnlineBotSelectScene
       └─ JOIN button:
            Show text input for room code → "Connect" button
            On success → both transition to OnlineBotSelectScene

OnlineBotSelectScene  (each player picks their bot)
  Host side:  picks bot, clicks FIGHT when opponent has also picked
  Client side: picks bot, sends {type:'hello', botKey} to host, shows "Waiting for host..."
  Host receives hello → enables FIGHT button → clicks FIGHT
  Host sends {type:'start', playerBotKey, aiBotKey} → both start BattleScene

BattleScene (online mode)
  init data: { playerBotKey, aiBotKey, isHost, peer, conn }
  → no BotAI
  → host: runs physics for both, sends state at 20Hz, receives client inputs
  → client: sends inputs each frame, applies received state
  → on game over: host sends {type:'go', winner, reason}, both return to MainMenuScene
```

---

## Network Protocol

All messages are JSON objects sent over the PeerJS data channel.

| Message | Direction | Payload |
|---|---|---|
| `hello` | client → host | `{ type:'hello', botKey:'crusher' }` |
| `start` | host → client | `{ type:'start', playerBotKey:'crusher', aiBotKey:'rampage' }` |
| `input` | client → host | `{ type:'input', u:1, d:0, l:0, r:1 }` (each frame) |
| `state` | host → client | `{ type:'state', p:{x,y,rot,hp,driveHP}, a:{x,y,rot,hp,driveHP}, timer }` (20 Hz) |
| `go` | host → client | `{ type:'go', winner:'Player'|'AI', reason:'pit'|'disable'|'time' }` |

In BattleScene, "Player" always refers to the host's bot (left, WASD). "AI" slot is now the client's bot (right, also WASD on client side).

---

## Files

### New
| File | Purpose |
|---|---|
| `net/PeerNet.js` | Thin PeerJS wrapper: `init(onConn)`, `connect(id, onOpen)`, `send(data)`, `onMessage(cb)`, `destroy()` |
| `scenes/OnlineLobbyScene.js` | Host/Join UI, room code display, PeerJS connection setup |
| `scenes/OnlineBotSelectScene.js` | Bot select with network ready-check; host sends `start` when both have picked |

### Modified
| File | Change |
|---|---|
| `scenes/ModeSelectScene.js` | Enable "1v1 Online" button → `OnlineLobbyScene` |
| `scenes/BattleScene.js` | Add `isHost`, `conn` to `init()`; branch online vs solo in `createBots`, `update`, `knockOut`, `timeUp` |
| `index.html` | Add PeerJS CDN script, add new scene/net scripts |
| `game.js` | Add `OnlineLobbyScene`, `OnlineBotSelectScene` to scene list |

---

## BattleScene Online Branches

**Host update loop:**
1. Read own WASD → move `playerBot`
2. Apply last received client input → move `aiBot` (client's bot)
3. Physics runs normally (collisions, pit, damage)
4. Every 50ms: send `state` packet to client
5. Knock-out/time-up: send `go` packet, then navigate both to MainMenuScene

**Client update loop:**
1. Read own WASD → capture as `{u,d,l,r}` booleans → send `input` packet to host
2. On `state` received: set both bot x/y/rotation/hp/driveHP directly
3. On `go` received: show game-over overlay, navigate to MainMenuScene
