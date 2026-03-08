class Bot extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    const key = config.key;
    if (!scene.textures.exists(key)) {
      Bot.createTexture(scene, config);
    }
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.botConfig = config;
    this.hp = config.hp || 100;
    this.maxHP = config.hp || 100;
    this.driveHP = config.driveHP || 50;
    this.maxDriveHP = config.driveHP || 50;
    this.weaponHP = config.weaponHP || 50;
    this.maxWeaponHP = config.weaponHP || 50;
    this.botSpeed = config.speed || 200;
    this.rotationSpeed = config.rotationSpeed || 150;

    this.body.setMaxVelocity(350, 350);
    this.setDepth(2);
    this.setOrigin(0.5, 0.5);

    this.shadow = scene.add.ellipse(x, y + 6, 58, 18, 0x000000, 0.35);
    this.shadow.setDepth(1);
  }

  static createTexture(scene, config) {
    const g = scene.make.graphics({ add: false });
    const w = 65;
    const h = 45;

    // Main body
    g.fillStyle(config.color, 1);
    g.fillRect(0, 5, w - 15, h - 10);

    // Wedge front
    g.fillStyle(config.wedgeColor || 0xaaaaaa, 1);
    g.fillTriangle(w - 15, 5, w - 15, h - 10, w, h / 2);

    // Draw wheels based on chassis type
    const chassis = config.chassis || '4wheel';
    Bot._drawWheels(g, w, h, chassis);

    // Body panel
    g.fillStyle(0x000000, 0.3);
    g.fillRect(8, 12, 22, h - 24);

    g.generateTexture(config.key, w, h);
    g.destroy();
  }

  static _drawWheels(g, w, h, chassis) {
    const wheelColor = 0x1a1a1a;
    const segmentColor = 0x444444;
    g.fillStyle(wheelColor, 1);

    if (chassis === '2wheel') {
      // 2 large wheels at opposite ends
      g.fillRect(2, 1, 12, 16);    // Front wheel
      g.fillRect(w - 20, 1, 12, 16); // Rear wheel
      g.fillRect(2, h - 17, 12, 16); // Front wheel
      g.fillRect(w - 20, h - 17, 12, 16); // Rear wheel
      // Wheel tread
      g.fillStyle(segmentColor, 1);
      for (let i = 2; i < 14; i += 3) {
        g.fillRect(i, 2, 2, 14);
        g.fillRect(i, h - 16, 2, 14);
        g.fillRect(w - 19, 2, 2, 14);
        g.fillRect(w - 19, h - 16, 2, 14);
      }
    } else if (chassis === '8wheel') {
      // 8 small wheels - maximum traction
      const wheelCount = 8;
      const spacing = (w - 20) / (wheelCount + 1);
      for (let i = 0; i < wheelCount; i++) {
        const x = 2 + (i + 1) * spacing;
        g.fillStyle(wheelColor, 1);
        g.fillRect(x - 3, 2, 6, 8);
        g.fillRect(x - 3, h - 10, 6, 8);
        g.fillStyle(segmentColor, 1);
        g.fillRect(x - 2, 3, 4, 6);
        g.fillRect(x - 2, h - 9, 4, 6);
      }
    } else {
      // 4wheel - default configuration
      g.fillRect(2, 2, w - 18, 9);
      g.fillRect(2, h - 11, w - 18, 9);
      g.fillStyle(segmentColor, 1);
      for (let i = 4; i < w - 20; i += 9) {
        g.fillRect(i, 3, 5, 7);
        g.fillRect(i, h - 10, 5, 7);
      }
    }
  }

  takeDamage(amount, zone) {
    const hz = GAME_CONFIG.hitZones;
    const multiplier = hz[zone] ?? 1.0;

    const finalDamage = amount * multiplier;
    this.hp = Math.max(0, this.hp - finalDamage);

    const drv = GAME_CONFIG.drive;
    this.driveHP = Math.max(0, this.driveHP - finalDamage * drv.damageRate);
    if (this.driveHP <= drv.speedPenaltyThreshold) {
      this.botSpeed = this.botConfig.speed * drv.speedPenaltyFactor;
    }

    this.setTint(0xff5555);
    this.scene.time.delayedCall(130, () => {
      if (this.active) this.clearTint();
    });

    return this.hp <= 0;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.shadow) {
      this.shadow.setPosition(this.x + 3, this.y + 6);
    }
  }

  destroy(fromScene) {
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
