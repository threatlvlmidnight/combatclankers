class SpinnerBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('spinnerbot')) {
      SpinnerBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'spinnerbot',
      color: 0x0d4d2a,
      hp: 250,
      driveHP: 40,
      weaponHP: 70,
      speed: 215,
      rotationSpeed: 150
    });

    this.spinnerActive = false;
    this.spinnerAngle = 0;
    this._jWasDown = false;

    // Ring: always visible — dim when off, bright when on
    this._ringGfx = scene.add.graphics().setDepth(3);
    // Blades: only drawn when spinning
    this._spinGfx = scene.add.graphics().setDepth(4);
    // "SPIN ON/OFF" label
    this._statusLabel = scene.add.text(x, y + 38, 'SPIN: OFF', {
      fontSize: '9px', color: '#226633', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'VORTEX', {
      fontSize: '11px', color: '#33cc66', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x0d4d2a, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x1a8844, 1);
    g.fillRect(w - 20, 3, 20, h - 6);
    g.fillStyle(0x0a3320, 1);
    g.fillRect(8, h / 2 - 2, w - 28, 4);
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 22, 8);
    g.fillRect(2, h - 9, w - 22, 8);
    g.fillStyle(0x333333, 1);
    for (let i = 4; i < w - 24; i += 9) {
      g.fillRect(i, 2, 5, 6);
      g.fillRect(i, h - 8, 5, 6);
    }
    g.lineStyle(1, 0x33ff88, 0.6);
    g.beginPath(); g.moveTo(w - 20, 3); g.lineTo(w - 20, h - 3); g.strokePath();
    g.generateTexture('spinnerbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta) {
    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown) {
      this.spinnerActive = !this.spinnerActive;
      if (this._statusLabel) {
        this._statusLabel.setText(this.spinnerActive ? 'SPIN: ON' : 'SPIN: OFF');
        this._statusLabel.setColor(this.spinnerActive ? '#44ff88' : '#226633');
      }
    }
    this._jWasDown = jDown;

    if (this.spinnerActive) this.spinnerAngle += delta * 0.014;
    this._updateSpinnerGfx();
  }

  _updateSpinnerGfx() {
    const drumX = this.x + Math.cos(this.rotation) * 20;
    const drumY = this.y + Math.sin(this.rotation) * 20;

    // Ring: always draw, color varies
    this._ringGfx.clear();
    if (this.spinnerActive) {
      const pulse = 0.7 + 0.3 * Math.sin(this.spinnerAngle * 3);
      this._ringGfx.lineStyle(3, 0x44ffaa, pulse);
    } else {
      this._ringGfx.lineStyle(1, 0x226633, 0.5);
    }
    this._ringGfx.strokeCircle(drumX, drumY, 16);

    if (this.spinnerActive) {
      this._drawBlades(drumX, drumY);
    } else {
      this._spinGfx.clear();
    }
  }

  _drawBlades(drumX, drumY) {
    const g = this._spinGfx;
    g.clear();
    for (let i = 0; i < 4; i++) {
      const a = this.spinnerAngle + (i * Math.PI / 2);
      const cos = Math.cos(a), sin = Math.sin(a);
      const pCos = Math.cos(a + Math.PI / 2), pSin = Math.sin(a + Math.PI / 2);
      g.fillStyle(0x88ffcc, 1);
      g.fillTriangle(
        drumX + cos * 5 - pCos * 5, drumY + sin * 5 - pSin * 5,
        drumX + cos * 5 + pCos * 5, drumY + sin * 5 + pSin * 5,
        drumX + cos * 28,           drumY + sin * 28
      );
    }
    // Hub
    g.fillStyle(0x22ff88, 1);
    g.fillCircle(drumX, drumY, 5);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._ringGfx) this._ringGfx.destroy();
    if (this._spinGfx) this._spinGfx.destroy();
    super.destroy(fromScene);
  }
}
