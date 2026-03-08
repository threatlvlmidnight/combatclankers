// bots/CustomBot.js
// Chassis and armor definitions — used by GarageScene builder and CustomBot itself.
const CHASSIS_DEFS = {
  '2wheel':  { label: '2-WHEEL',  speed: 260, rotation: 80,  baseHP: 220, desc: 'Fastest. Low turning.' },
  '4wheel':  { label: '4-WHEEL',  speed: 200, rotation: 130, baseHP: 280, desc: 'Balanced all-rounder.' },
  '8wheel':  { label: '8-WHEEL',  speed: 140, rotation: 175, baseHP: 340, desc: 'Slowest. Iron-grip turn.' }
};

const ARMOR_DEFS = {
  light:  { label: 'LIGHT',  speedFactor: 1.25, hpFactor: 0.70, dr: 0.00, desc: 'Fragile but quick.' },
  medium: { label: 'MEDIUM', speedFactor: 1.00, hpFactor: 1.00, dr: 0.20, desc: 'Balanced protection.' },
  heavy:  { label: 'HEAVY',  speedFactor: 0.45, hpFactor: 1.40, dr: 0.35, desc: 'Very slow but tough.' }
};

const WEAPON_DEFS = {
  wedge:   { label: 'Wedge',        power: 20, desc: 'No active weapon.' },
  hammer:  { label: 'Hammer',       power: 75, desc: 'Q: overhead slam.' },
  spinner: { label: 'Drum Spinner', power: 85, desc: 'Q: toggle spinner.' },
  flipper: { label: 'Flipper',      power: 80, desc: 'Q: hydraulic launch.' },
  crusher: { label: 'Crusher',      power: 70, desc: 'Q: grab and steer.' }
};

class CustomBot extends Bot {
  constructor(scene, x, y, rosterEntry) {
    const cfg = rosterEntry.loadoutConfig;
    const stats = CustomBot._computeStats(cfg);
    const textureKey = `custom_${cfg.key}`;

    if (!scene.textures.exists(textureKey)) {
      CustomBot._makeTexture(scene, textureKey, cfg.color, cfg.chassis);
    }

    super(scene, x, y, {
      key: textureKey,
      color: cfg.color,
      chassis: cfg.chassis,
      hp: stats.hp,
      driveHP: 50,
      weaponHP: 55,
      speed: stats.speed,
      rotationSpeed: stats.rotation
    });

    this._loadout = cfg;
    this._damageReduction = stats.dr;
    this._weaponType = cfg.weapon;

    // Name label
    this.nameLabel = scene.add.text(x, y - 38, cfg.name.toUpperCase(), {
      fontSize: '11px', color: '#' + cfg.color.toString(16).padStart(6, '0'),
      fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    // Init weapon-specific state
    this._initWeapon(scene, x, y);
  }

  static _computeStats(cfg) {
    const ch = CHASSIS_DEFS[cfg.chassis] || CHASSIS_DEFS['4wheel'];
    const ar = ARMOR_DEFS[cfg.armor] || ARMOR_DEFS.medium;
    return {
      speed:    Math.round(ch.speed * ar.speedFactor),
      hp:       Math.round(ch.baseHP * ar.hpFactor),
      rotation: ch.rotation,
      dr:       ar.dr
    };
  }

  static computeDisplayStats(cfg) {
    const ch = CHASSIS_DEFS[cfg.chassis] || CHASSIS_DEFS['4wheel'];
    const ar = ARMOR_DEFS[cfg.armor] || ARMOR_DEFS.medium;
    const wp = WEAPON_DEFS[cfg.weapon] || WEAPON_DEFS.wedge;
    // Normalize to 0-100 display range
    const speedNorm = Math.round((ch.speed * ar.speedFactor) / 3.25);
    const armorNorm = Math.round(40 + ar.dr * 100 + ar.hpFactor * 25);
    return { speed: Math.min(100, speedNorm), armor: Math.min(100, armorNorm), weapon: wp.power };
  }

  static _makeTexture(scene, key, color, chassis) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(color, 1);
    g.fillRect(0, 5, w - 15, h - 10);
    g.fillStyle(0xaaaaaa, 1);
    g.fillTriangle(w - 15, 5, w - 15, h - 10, w, h / 2);
    
    // Draw wheels based on chassis
    Bot._drawWheels(g, w, h, chassis || '4wheel');
    
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _initWeapon(scene, x, y) {
    switch (this._weaponType) {
      case 'spinner':
        this.spinnerActive = false;
        this.spinEnergy = 0;
        this.spinnerAngle = 0;
        this._jWasDown = false;
        this._ringGfx = scene.add.graphics().setDepth(3);
        this._spinGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'SPIN: OFF', {
          fontSize: '9px', color: '#226633', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'hammer':
        this.hammerSwinging = false;
        this._hammerAngle = -0.9;
        this._hammerReturning = false;
        this._hitDealt = false;
        this._jWasDown = false;
        this._swingEnemy = null;
        this._swingGlow = false;
        this._hammerGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'HAMMER READY', {
          fontSize: '9px', color: '#886622', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'flipper':
        this.flipCharge = 100;
        this._flipArmAngle = 0;
        this._armFiring = false;
        this._armReturnDelay = 0;
        this._jWasDown = false;
        this._wallCheckTimer = 0;
        this._flippedEnemy = null;
        this._wallSlamDealt = false;
        this._flipGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, '▓▓▓▓▓ READY', {
          fontSize: '9px', color: '#4488ff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
      case 'crusher':
        this.crushGrabActive = false;
        this._grabTimer = 0;
        this._grabCooldown = 0;
        this._jWasDown = false;
        this._clawAngle = 0.5;
        this._wallSlamCooldown = 0;
        this._clawGfx = scene.add.graphics().setDepth(4);
        this._statusLabel = scene.add.text(x, y + 38, 'JAWS: OPEN', {
          fontSize: '9px', color: '#884422', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(5);
        break;
    }
  }

  takeDamage(amount, zone) {
    return super.takeDamage(amount * (1 - this._damageReduction), zone);
  }

  // Delegate updateWeapon to the matching dedicated bot prototype methods
  updateWeapon(keys, delta, enemy) {
    switch (this._weaponType) {
      case 'spinner': SpinnerBot.prototype.updateWeapon.call(this, keys, delta); break;
      case 'hammer':  HammerBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
      case 'flipper': FlipperBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
      case 'crusher': CrusherBot.prototype.updateWeapon.call(this, keys, delta, enemy); break;
      // wedge has no active weapon, so nothing to do
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    // Sync passive weapon gfx
    switch (this._weaponType) {
      case 'spinner': if (!this.spinnerActive) this._updateSpinnerGfx(); break;
      case 'hammer':  if (!this.hammerSwinging) this._updateHammerGfx(); break;
      case 'flipper': if (!this._armFiring) this._updateFlipperGfx(); break;
      case 'crusher': if (!this.crushGrabActive) this._updateClawGfx(); break;
    }
  }

  // Delegating wrapper methods for weapon graphics updates
  _updateSpinnerGfx() { SpinnerBot.prototype._updateSpinnerGfx.call(this); }
  _drawBlades(drumX, drumY) { SpinnerBot.prototype._drawBlades.call(this, drumX, drumY); }
  _updateHammerGfx() { HammerBot.prototype._updateHammerGfx.call(this); }
  _updateFlipperGfx() { FlipperBot.prototype._updateFlipperGfx.call(this); }
  _updateClawGfx() { CrusherBot.prototype._updateClawGfx.call(this); }

  // Delegating wrapper methods for weapon actions
  _fire(enemy) { FlipperBot.prototype._fire.call(this, enemy); }
  _release(enemy) { CrusherBot.prototype._release.call(this, enemy); }
  _updateStatusLabel() { 
    if (this._weaponType === 'flipper') FlipperBot.prototype._updateStatusLabel.call(this);
    else if (this._statusLabel && this._weaponType === 'hammer') {
      // HammerBot doesn't have _updateStatusLabel, so we skip it
    }
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    ['_ringGfx','_spinGfx','_hammerGfx','_flipGfx','_chargeBar','_clawGfx'].forEach(k => {
      if (this[k]) this[k].destroy();
    });
    super.destroy(fromScene);
  }
}
