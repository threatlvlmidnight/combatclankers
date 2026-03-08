class FlipperBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('flipperbot')) {
      FlipperBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'flipperbot',
      color: 0x1155cc,
      hp: 300,
      driveHP: 55,
      weaponHP: 60,
      speed: 195,
      rotationSpeed: 125
    });

    this.flipCharge = 100;
    this._flipArmAngle = 0;   // 0 = resting, up to 1.2 = fully extended
    this._armFiring = false;
    this._armReturnDelay = 0;
    this._jWasDown = false;
    this._wallCheckTimer = 0;
    this._flippedEnemy = null;
    this._wallSlamDealt = false;

    this._flipGfx = scene.add.graphics().setDepth(4);
    this._chargeBar = scene.add.graphics().setDepth(5);

    this._statusLabel = scene.add.text(x, y + 38, '▓▓▓▓▓ READY', {
      fontSize: '9px', color: '#4488ff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'CATAPULT', {
      fontSize: '11px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    this._updateFlipperGfx();
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x1155cc, 1);
    g.fillRect(0, 0, w, h);
    // Chrome scoop base at front
    g.fillStyle(0x88aadd, 1);
    g.fillRect(w - 18, 6, 18, h - 12);
    // Tracks
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 20, 8);
    g.fillRect(2, h - 9, w - 20, 8);
    g.fillStyle(0x333333, 1);
    for (let i = 4; i < w - 22; i += 9) {
      g.fillRect(i, 2, 5, 6);
      g.fillRect(i, h - 8, 5, 6);
    }
    g.generateTexture('flipperbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta, enemy) {
    const cfg = GAME_CONFIG.flipper;

    // Recharge
    if (this.flipCharge < 100) {
      this.flipCharge = Math.min(100, this.flipCharge + (delta / cfg.rechargeMs) * 100);
    }

    const jDown = keys.primaryFire.isDown;
    if (jDown && !this._jWasDown && !this._armFiring) {
      this._fire(enemy);
    }
    this._jWasDown = jDown;

    // Arm animation — forward stroke
    if (this._armFiring) {
      this._flipArmAngle += delta / cfg.armSwingMs * 1.2;
      if (this._flipArmAngle >= 1.2) {
        this._flipArmAngle = 1.2;
        this._armFiring = false;
        this._armReturnDelay = 200;
      }
    }
    // Arm return after delay
    if (!this._armFiring && this._armReturnDelay > 0) {
      this._armReturnDelay -= delta;
      if (this._armReturnDelay <= 0) {
        this._flipArmAngle = 0;
      }
    }

    // Wall slam detection for 800ms after flip
    if (this._wallCheckTimer > 0) {
      this._wallCheckTimer -= delta;
      if (this._flippedEnemy?.active && !this._wallSlamDealt) {
        const e = this._flippedEnemy;
        const nearWall = e.x < 82 || e.x > 818 || e.y < 125 || e.y > 561;
        if (nearWall) {
          this._wallSlamDealt = true;
          e.takeDamage(cfg.wallSlamDamage, 'side');
          if (this.scene.showImpactText) {
            this.scene.showImpactText(e.x, e.y - 20, 'CRUNCH!', '#ff3333');
          }
        }
      }
    }

    this._updateStatusLabel();
    this._updateFlipperGfx();
  }

  _fire(enemy) {
    const cfg = GAME_CONFIG.flipper;
    const chargeRatio = this.flipCharge / 100;
    this._armFiring = true;
    this._wallSlamDealt = false;
    this.flipCharge = 0;

    if (enemy?.active) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < cfg.rangeCheck) {
        const force = cfg.flipForce * chargeRatio;
        const angle = this.rotation;
        enemy.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
        enemy.takeDamage(cfg.flipDamage * chargeRatio, 'side');
        this._flippedEnemy = enemy;
        this._wallCheckTimer = 800;

        // Launch animation — tumble spin + arc scale
        const spinDir = Math.random() < 0.5 ? 1 : -1;
        enemy.setAngularVelocity(spinDir * 600 * chargeRatio);
        const arcDuration = 180 + chargeRatio * 220; // 180–400ms
        this.scene.tweens.add({
          targets: enemy,
          scaleX: 1 + 0.35 * chargeRatio,
          scaleY: 1 + 0.35 * chargeRatio,
          duration: arcDuration * 0.45,
          ease: 'Sine.easeOut',
          yoyo: true,
          onComplete: () => {
            if (!enemy.active) return;
            enemy.setAngularVelocity(0);
            enemy.setScale(1);
            // Landing damage
            const landDamage = Math.round(cfg.flipDamage * chargeRatio * 0.6);
            if (landDamage > 0) enemy.takeDamage(landDamage, 'side');
            if (this.scene.showImpactText && chargeRatio >= 0.4) {
              this.scene.showImpactText(enemy.x, enemy.y - 16, 'THUD!', '#cc7722');
            }
          }
        });

        if (this.scene.showImpactText) {
          if (chargeRatio >= 0.85) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'FWOOSH!', '#ff8800');
            this.scene.cameras.main.shake(80, 0.007);
          } else if (chargeRatio >= 0.4) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'WHOMP!', '#886600');
          } else {
            this.scene.showImpactText(enemy.x, enemy.y - 14, 'thwp!', '#666666');
          }
        }
      }
    }
  }

  _updateStatusLabel() {
    if (!this._statusLabel) return;
    const segs = Math.round(this.flipCharge / 20); // 0-5 segments
    const bar = '▓'.repeat(segs) + '░'.repeat(5 - segs);
    if (this.flipCharge >= 100) {
      this._statusLabel.setText(`${bar} READY`).setColor('#4488ff');
    } else {
      this._statusLabel.setText(`${bar} ${Math.floor(this.flipCharge)}%`).setColor('#224466');
    }
  }

  _updateFlipperGfx() {
    const g = this._flipGfx;
    g.clear();

    // Scoop arm — rotates up from front of bot
    const frontX = this.x + Math.cos(this.rotation) * 28;
    const frontY = this.y + Math.sin(this.rotation) * 28;
    const armAngle = this.rotation - this._flipArmAngle; // rotates upward
    const armLen = 20;
    const armW = 7;

    const px = Math.cos(armAngle + Math.PI / 2) * armW;
    const py = Math.sin(armAngle + Math.PI / 2) * armW;
    const ex = Math.cos(armAngle) * armLen;
    const ey = Math.sin(armAngle) * armLen;

    // Arm color: orange-white at full charge
    const chargeRatio = this.flipCharge / 100;
    const armColor = chargeRatio >= 1.0 ? 0xffa040 : 0x6688cc;
    g.fillStyle(armColor, 1);
    g.fillTriangle(
      frontX - px, frontY - py,
      frontX + px, frontY + py,
      frontX + ex + px, frontY + ey + py
    );
    g.fillTriangle(
      frontX - px, frontY - py,
      frontX + ex + px, frontY + ey + py,
      frontX + ex - px, frontY + ey - py
    );

    // Scoop tip
    g.fillStyle(0xaaccff, 1);
    g.fillCircle(frontX + ex, frontY + ey, 5);

    g.setPosition(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    if (!this._armFiring) this._updateFlipperGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._flipGfx) this._flipGfx.destroy();
    if (this._chargeBar) this._chargeBar.destroy();
    super.destroy(fromScene);
  }
}
