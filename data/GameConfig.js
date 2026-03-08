// data/GameConfig.js
// Tweak all balance numbers here. No code changes needed elsewhere.
const GAME_CONFIG = {

  // ── Collision ──────────────────────────────────────────────────────────────
  collision: {
    damageMultiplier: 0.008,  // base damage = relSpeed × this  (lower = less)
    minRelSpeed: 25           // ignore collisions slower than this px/s
  },

  // ── Weapons ────────────────────────────────────────────────────────────────
  weapons: {
    // SpinnerBot: multiplies collision damage dealt TO the opponent
    spinnerMultiplier: 5.0,

    // HammerBot: flat damage on a successful hammer tip hit
    hammerDamage: 35,

    // Hammer swing timing (milliseconds)
    hammerSwingMs: 280,
    hammerReturnMs: 220
  },

  // ── Hit zones ──────────────────────────────────────────────────────────────
  // Damage is multiplied by these when hitting different sides of a bot
  hitZones: {
    front: 0.5,   // armored wedge front
    side:  1.0,
    rear:  1.5    // exposed rear
  },

  // ── Drive system ───────────────────────────────────────────────────────────
  drive: {
    damageRate: 0.2,            // drive HP lost per 1 HP of body damage
    speedPenaltyThreshold: 10,  // drive HP below this triggers speed penalty
    speedPenaltyFactor: 0.4     // bot speed × this when drive is crippled
  }

};
