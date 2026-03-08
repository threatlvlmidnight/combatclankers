class SpinnerBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('spinnerbot')) {
      SpinnerBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'spinnerbot',
      color: 0x0d4d2a, // placeholder — texture is custom
      hp: 250,
      driveHP: 40,
      weaponHP: 70,
      speed: 215,
      rotationSpeed: 150
    });

    this.spinnerActive = false;
    this.spinnerAngle = 0;
    this._jWasDown = false;

    this._spinGfx = scene.add.graphics().setDepth(4);

    this.nameLabel = scene.add.text(x, y - 38, 'VORTEX', {
      fontSize: '11px', color: '#33cc66', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;

    // Body
    g.fillStyle(0x0d4d2a, 1);
    g.fillRect(0, 0, w, h);

    // Drum housing at front
    g.fillStyle(0x1a8844, 1);
    g.fillRect(w - 20, 3, 20, h - 6);

    // Center spine
    g.fillStyle(0x0a3320, 1);
    g.fillRect(8, h / 2 - 2, w - 28, 4);

    // Tracks
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 22, 8);
    g.fillRect(2, h - 9, w - 22, 8);

    // Track segments
    g.fillStyle(0x333333, 1);
    for (let i = 4; i < w - 24; i += 9) {
      g.fillRect(i, 2, 5, 6);
      g.fillRect(i, h - 8, 5, 6);
    }

    // Drum detail lines
    g.lineStyle(1, 0x33ff88, 0.6);
    g.beginPath(); g.moveTo(w - 20, 3); g.lineTo(w - 20, h - 3); g.strokePath();

    g.generateTexture('spinnerbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta) {
    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown) {
      this.spinnerActive = !this.spinnerActive;
    }
    this._jWasDown = jDown;

    if (this.spinnerActive) {
      this.spinnerAngle += delta * 0.014; // ~800 deg/s
      this._drawSpinner();
    } else {
      this._spinGfx.clear();
    }
  }

  _drawSpinner() {
    const g = this._spinGfx;
    g.clear();

    // 4 blades
    for (let i = 0; i < 4; i++) {
      const a = this.spinnerAngle + (i * Math.PI / 2);
      const cos = Math.cos(a), sin = Math.sin(a);
      const perpCos = Math.cos(a + Math.PI / 2), perpSin = Math.sin(a + Math.PI / 2);
      g.fillStyle(0x44ffaa, 0.95);
      g.fillTriangle(
        cos * 4 - perpCos * 3, sin * 4 - perpSin * 3,
        cos * 4 + perpCos * 3, sin * 4 + perpSin * 3,
        cos * 20,              sin * 20
      );
    }

    // Hub
    g.fillStyle(0x22cc66, 1);
    g.fillCircle(0, 0, 4);

    // Position at the drum (front of bot)
    const drumOffsetX = Math.cos(this.rotation) * 20;
    const drumOffsetY = Math.sin(this.rotation) * 20;
    g.setPosition(this.x + drumOffsetX, this.y + drumOffsetY);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    // Keep spinner graphic anchored to drum even when idle
    if (!this.spinnerActive) {
      const drumOffsetX = Math.cos(this.rotation) * 20;
      const drumOffsetY = Math.sin(this.rotation) * 20;
      this._spinGfx.setPosition(this.x + drumOffsetX, this.y + drumOffsetY);
    }
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._spinGfx) this._spinGfx.destroy();
    super.destroy(fromScene);
  }
}
