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
    // SpinnerBot: multiplies collision damage dealt TO the opponent (INCREASED for more impact)
    spinnerMultiplier: 38.0,

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
  },

  // ── Spinners ────────────────────────────────────────────────────────────────
  spinners: {
    drumSpinUpMs:      3800,   // time from 0% to 100% for drum spinner (faster spinup)
    driftForce:        40,     // sideways drift force on horizontal spinner at full charge
    verticalSpeedFactor: 0.65, // speed multiplier for vertical spinner at full charge
    selfDamageRatio:   0.10,   // fraction of dealt damage reflected back to spinner
    knockbackBase:     320     // max velocity impulse applied to opponent on hit
  },

  // ── Flipper ─────────────────────────────────────────────────────────────────
  flipper: {
    flipForce:     600,   // velocity impulse at full charge
    flipDamage:    15,    // HP damage at full charge
    wallSlamDamage: 45,   // bonus damage when launched bot hits a wall
    rechargeMs:    6000,  // full recharge time
    armSwingMs:    120,   // arm forward stroke duration
    rangeCheck:    62     // max distance to flip target
  },

  // ── Crusher ─────────────────────────────────────────────────────────────────
  crusher: {
    grabRange:       55,   // max distance to initiate grab
    crushDps:        8,    // HP per second while grabbed
    wallSlamDamage:  38,   // bonus HP when grabbed bot is driven into a wall
    maxGrabMs:       3000, // auto-release after this long
    grabCooldownMs:  2000  // cooldown between grabs
  }

};
