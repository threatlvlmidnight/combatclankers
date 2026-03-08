class HammerBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('hammerbot')) {
      HammerBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'hammerbot',
      color: 0x4a2800,
      hp: 320,
      driveHP: 60,
      weaponHP: 60,
      speed: 170,
      rotationSpeed: 120
    });

    this.hammerSwinging = false;
    this._hammerAngle = -0.9;   // current arm angle relative to bot front
    this._hammerReturning = false;
    this._hitDealt = false;
    this._jWasDown = false;
    this._swingEnemy = null;
    this._swingGlow = false;

    this._hammerGfx = scene.add.graphics().setDepth(4);
    this._updateHammerGfx();

    this._statusLabel = scene.add.text(x, y + 38, 'HAMMER READY', {
      fontSize: '9px', color: '#886622', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'MJOLNIR', {
      fontSize: '11px', color: '#cc8833', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x4a2800, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x6a3800, 1);
    g.fillRect(w - 16, 2, 16, h - 4);
    g.fillStyle(0x885522, 1);
    g.fillRect(16, h / 2 - 5, 22, 10);
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 18, 8);
    g.fillRect(2, h - 9, w - 18, 8);
    g.fillStyle(0x333333, 1);
    for (let i = 4; i < w - 20; i += 9) {
      g.fillRect(i, 2, 5, 6);
      g.fillRect(i, h - 8, 5, 6);
    }
    g.generateTexture('hammerbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta, enemy) {
    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown && !this.hammerSwinging) {
      // Begin swing
      this.hammerSwinging = true;
      this._hammerAngle = -0.9;
      this._hammerReturning = false;
      this._hitDealt = false;
      this._swingEnemy = enemy;
      this._swingGlow = false;
      if (this._statusLabel) this._statusLabel.setText('SWINGING!').setColor('#ffaa22');
    }
    this._jWasDown = jDown;

    if (this.hammerSwinging) {
      const cfg = GAME_CONFIG.weapons;
      const swingSpeed = 1.8 / cfg.hammerSwingMs;    // radians per ms
      const returnSpeed = 1.8 / cfg.hammerReturnMs;

      if (!this._hammerReturning) {
        // Forward stroke
        this._hammerAngle += delta * swingSpeed;
        this._swingGlow = this._hammerAngle > -0.1;

        // Hit detection during active window
        if (!this._hitDealt && this._swingGlow && this._swingEnemy?.active) {
          const localAngle = this.rotation + this._hammerAngle;
          const tipX = this.x + Math.cos(localAngle) * 42;
          const tipY = this.y + Math.sin(localAngle) * 42;
          if (Phaser.Math.Distance.Between(tipX, tipY, this._swingEnemy.x, this._swingEnemy.y) < 34) {
            this._hitDealt = true;
            this._swingEnemy.takeDamage(cfg.hammerDamage, 'side');
            this.scene.cameras.main.shake(110, 0.009);
          }
        }

        if (this._hammerAngle >= 0.9) {
          this._hammerAngle = 0.9;
          this._hammerReturning = true;
          this._swingGlow = false;
        }
      } else {
        // Return stroke
        this._hammerAngle -= delta * returnSpeed;
        if (this._hammerAngle <= -0.9) {
          this._hammerAngle = -0.9;
          this.hammerSwinging = false;
          this._hammerReturning = false;
          if (this._statusLabel) this._statusLabel.setText('HAMMER READY').setColor('#886622');
        }
      }
    }

    this._updateHammerGfx();
  }

  _updateHammerGfx() {
    const g = this._hammerGfx;
    g.clear();

    const localAngle = this.rotation + this._hammerAngle;
    const armLen = 38;
    const headHalf = 13;
    const aw = 5;

    const ax = Math.cos(localAngle + Math.PI / 2) * aw;
    const ay = Math.sin(localAngle + Math.PI / 2) * aw;
    const ex = Math.cos(localAngle) * armLen;
    const ey = Math.sin(localAngle) * armLen;

    // Arm
    g.fillStyle(0x885522, 1);
    g.fillTriangle(-ax, -ay,  ax, ay,  ex + ax, ey + ay);
    g.fillTriangle(-ax, -ay,  ex + ax, ey + ay,  ex - ax, ey - ay);

    // Hammer head
    const px = Math.cos(localAngle + Math.PI / 2) * headHalf;
    const py = Math.sin(localAngle + Math.PI / 2) * headHalf;
    const fw = Math.cos(localAngle) * 9;
    const fh = Math.sin(localAngle) * 9;
    g.fillStyle(this._swingGlow ? 0xffcc44 : 0xcc8833, 1);
    g.fillTriangle(ex - px, ey - py,  ex + px, ey + py,  ex + px + fw, ey + py + fh);
    g.fillTriangle(ex - px, ey - py,  ex + px + fw, ey + py + fh,  ex - px + fw, ey - py + fh);

    // Glow ring on head during active strike
    if (this._swingGlow) {
      g.lineStyle(3, 0xffff88, 0.8);
      g.strokeCircle(ex + fw / 2, ey + fh / 2, headHalf + 4);
    }

    g.setPosition(this.x, this.y);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    // Keep gfx synced when not in weapon update (e.g. AI-controlled bot)
    if (!this.hammerSwinging) this._updateHammerGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._hammerGfx) this._hammerGfx.destroy();
    super.destroy(fromScene);
  }
}
