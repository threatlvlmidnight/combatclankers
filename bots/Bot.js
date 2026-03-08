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

    // Tracks
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(2, 2, w - 18, 9);
    g.fillRect(2, h - 11, w - 18, 9);

    // Track segments
    g.fillStyle(0x444444, 1);
    for (let i = 4; i < w - 20; i += 9) {
      g.fillRect(i, 3, 5, 7);
      g.fillRect(i, h - 10, 5, 7);
    }

    // Body panel
    g.fillStyle(0x000000, 0.3);
    g.fillRect(8, 12, 22, h - 24);

    g.generateTexture(config.key, w, h);
    g.destroy();
  }

  takeDamage(amount, zone) {
    let multiplier = 1.0;
    if (zone === 'front') multiplier = 0.5;
    else if (zone === 'rear') multiplier = 1.5;

    const finalDamage = amount * multiplier;
    this.hp = Math.max(0, this.hp - finalDamage);

    // Damage drive slightly on any hit
    this.driveHP = Math.max(0, this.driveHP - finalDamage * 0.2);
    if (this.driveHP <= 10) {
      this.botSpeed = this.botConfig.speed * 0.4;
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
