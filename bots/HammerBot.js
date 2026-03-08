class HammerBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('hammerbot')) {
      HammerBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'hammerbot',
      color: 0x4a2800, // placeholder — texture is custom
      hp: 320,
      driveHP: 60,
      weaponHP: 60,
      speed: 170,
      rotationSpeed: 120
    });

    this.hammerSwinging = false;
    this._hammerAngle = -0.9; // resting angle offset from bot front
    this._jWasDown = false;

    this._hammerGfx = scene.add.graphics().setDepth(4);
    this._updateHammerGfx();

    this.nameLabel = scene.add.text(x, y - 38, 'MJOLNIR', {
      fontSize: '11px', color: '#cc8833', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;

    // Thick body
    g.fillStyle(0x4a2800, 1);
    g.fillRect(0, 0, w, h);

    // Front armor
    g.fillStyle(0x6a3800, 1);
    g.fillRect(w - 16, 2, 16, h - 4);

    // Hammer pivot mount (center-top area)
    g.fillStyle(0x885522, 1);
    g.fillRect(16, h / 2 - 5, 22, 10);

    // Tracks
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 18, 8);
    g.fillRect(2, h - 9, w - 18, 8);

    // Track segments
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
      this._startSwing(enemy);
    }
    this._jWasDown = jDown;
    this._updateHammerGfx();
  }

  _startSwing(enemy) {
    this.hammerSwinging = true;
    this._hammerAngle = -0.9;

    this.scene.tweens.add({
      targets: this,
      _hammerAngle: 0.9,
      duration: 280,
      ease: 'Power3',
      onUpdate: () => {
        // Check hit once as hammer passes through the strike zone
        if (!this._hitDealt && this._hammerAngle > -0.1 && enemy?.active) {
          const localAngle = this.rotation + this._hammerAngle;
          const tipX = this.x + Math.cos(localAngle) * 40;
          const tipY = this.y + Math.sin(localAngle) * 40;
          if (Phaser.Math.Distance.Between(tipX, tipY, enemy.x, enemy.y) < 32) {
            this._hitDealt = true;
            enemy.takeDamage(35, 'side');
            this.scene.cameras.main.shake(110, 0.009);
          }
        }
      },
      onComplete: () => {
        this._hitDealt = false;
        // Return to rest
        this.scene.tweens.add({
          targets: this,
          _hammerAngle: -0.9,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => { this.hammerSwinging = false; }
        });
      }
    });
  }

  _updateHammerGfx() {
    const g = this._hammerGfx;
    g.clear();

    const localAngle = this.rotation + this._hammerAngle;
    const armLen = 36;
    const headHalf = 11;

    // Arm
    const ax = Math.cos(localAngle + Math.PI / 2) * 3;
    const ay = Math.sin(localAngle + Math.PI / 2) * 3;
    const ex = Math.cos(localAngle) * armLen;
    const ey = Math.sin(localAngle) * armLen;
    g.fillStyle(0x885522, 1);
    g.fillTriangle(-ax, -ay,  ax, ay,  ex + ax, ey + ay);
    g.fillTriangle(-ax, -ay,  ex + ax, ey + ay,  ex - ax, ey - ay);

    // Hammer head (perpendicular bar at tip)
    const px = Math.cos(localAngle + Math.PI / 2) * headHalf;
    const py = Math.sin(localAngle + Math.PI / 2) * headHalf;
    const fw = Math.cos(localAngle) * 7;
    const fh = Math.sin(localAngle) * 7;
    g.fillStyle(0xcc8833, 1);
    g.fillTriangle(ex - px, ey - py,  ex + px, ey + py,  ex + px + fw, ey + py + fh);
    g.fillTriangle(ex - px, ey - py,  ex + px + fw, ey + py + fh,  ex - px + fw, ey - py + fh);

    g.setPosition(this.x, this.y);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (!this.hammerSwinging) this._updateHammerGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._hammerGfx) this._hammerGfx.destroy();
    super.destroy(fromScene);
  }
}
