class CrusherBot extends Bot {
  constructor(scene, x, y) {
    if (!scene.textures.exists('crusherbot')) {
      CrusherBot._makeTexture(scene);
    }
    super(scene, x, y, {
      key: 'crusherbot',
      color: 0x882200,
      hp: 340,
      driveHP: 65,
      weaponHP: 60,
      speed: 160,
      rotationSpeed: 110
    });

    this.crushGrabActive = false;
    this._grabTimer = 0;
    this._grabCooldown = 0;
    this._jWasDown = false;
    this._clawAngle = 0.5;  // 0 = closed, 0.5 = open (radians each claw)
    this._wallSlamCooldown = 0;

    this._clawGfx = scene.add.graphics().setDepth(4);

    this._statusLabel = scene.add.text(x, y + 38, 'JAWS: OPEN', {
      fontSize: '9px', color: '#884422', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(5);

    this.nameLabel = scene.add.text(x, y - 38, 'IRONJAW', {
      fontSize: '11px', color: '#cc4422', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);

    this._updateClawGfx();
  }

  static _makeTexture(scene) {
    const g = scene.make.graphics({ add: false });
    const w = 65, h = 45;
    g.fillStyle(0x882200, 1);
    g.fillRect(0, 0, w, h);
    // Heavy armor plates
    g.fillStyle(0xaa3311, 1);
    g.fillRect(w - 20, 2, 20, h - 4);
    g.fillStyle(0x111111, 1);
    g.fillRect(2, 1, w - 22, 9);
    g.fillRect(2, h - 10, w - 22, 9);
    g.fillStyle(0x444444, 1);
    for (let i = 4; i < w - 24; i += 9) {
      g.fillRect(i, 2, 5, 7);
      g.fillRect(i, h - 9, 5, 7);
    }
    // Reinforced center
    g.fillStyle(0x661100, 1);
    g.fillRect(10, 14, 28, h - 28);
    g.generateTexture('crusherbot', w, h);
    g.destroy();
  }

  updateWeapon(keys, delta, enemy) {
    const cfg = GAME_CONFIG.crusher;

    if (this._grabCooldown > 0) this._grabCooldown -= delta;
    if (this._wallSlamCooldown > 0) this._wallSlamCooldown -= delta;

    const jDown = keys.primaryFire.isDown;

    if (this.crushGrabActive) {
      // Auto-release
      this._grabTimer += delta;
      if (this._grabTimer >= cfg.maxGrabMs) {
        this._release(enemy);
      } else if (!jDown && this._jWasDown) {
        // Q button released — auto-release grab
        this._release(enemy);
      } else if (enemy?.active) {
        // Lock enemy to front of crusher
        const grabDist = 32;
        enemy.x = this.x + Math.cos(this.rotation) * grabDist;
        enemy.y = this.y + Math.sin(this.rotation) * grabDist;
        if (enemy.body) enemy.body.setVelocity(0, 0);

        // Sustained crush damage
        enemy.takeDamage((cfg.crushDps / 1000) * delta, 'side');

        // Wall slam detection — if we drive them into walls
        if (this._wallSlamCooldown <= 0) {
          const nearWall = enemy.x < 82 || enemy.x > 818 || enemy.y < 125 || enemy.y > 561;
          if (nearWall) {
            this._wallSlamCooldown = 800;
            enemy.takeDamage(cfg.wallSlamDamage, 'side');
            if (this.scene.showImpactText) {
              this.scene.showImpactText(enemy.x, enemy.y - 20, 'SLAM!', '#ff2200');
              this.scene.cameras.main.shake(120, 0.008);
            }
          }
        }
      } else {
        this._release(null);
      }
    } else if (jDown && !this._jWasDown && this._grabCooldown <= 0) {
      // Attempt grab
      if (enemy?.active) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist < cfg.grabRange) {
          this.crushGrabActive = true;
          this._grabTimer = 0;
          if (this._statusLabel) this._statusLabel.setText('JAWS: LOCKED!').setColor('#ff4422');
          if (this.scene.showImpactText) {
            this.scene.showImpactText(enemy.x, enemy.y - 20, 'CLAMP!', '#ffaa00');
          }
        }
      }
    }

    this._jWasDown = jDown;

    // Animate claw angle toward target
    const targetAngle = this.crushGrabActive ? 0.05 : (enemy?.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) < 80 ? 0.25 : 0.5);
    const clawSpeed = 0.005 * delta;
    if (Math.abs(this._clawAngle - targetAngle) < clawSpeed) {
      this._clawAngle = targetAngle;
    } else {
      this._clawAngle += (targetAngle > this._clawAngle ? 1 : -1) * clawSpeed;
    }

    this._updateClawGfx();
  }

  _release(enemy) {
    this.crushGrabActive = false;
    this._grabCooldown = GAME_CONFIG.crusher.grabCooldownMs;
    if (this._statusLabel) this._statusLabel.setText('JAWS: OPEN').setColor('#884422');
    if (this.scene.showImpactText && enemy?.active) {
      this.scene.showImpactText(enemy.x, enemy.y - 14, 'creak', '#554433');
    }
  }

  _updateClawGfx() {
    const g = this._clawGfx;
    g.clear();

    const frontX = this.x + Math.cos(this.rotation) * 26;
    const frontY = this.y + Math.sin(this.rotation) * 26;
    const clawLen = 18;

    const drawClaw = (sign) => {
      const baseAngle = this.rotation + sign * (Math.PI / 4 + this._clawAngle);
      const tipAngle = baseAngle + sign * 0.3;

      const bx = Math.cos(this.rotation + sign * 0.22) * 10;
      const by = Math.sin(this.rotation + sign * 0.22) * 10;

      const color = this.crushGrabActive ? 0xff4422 : 0xaa4422;
      g.lineStyle(4, color, 1);
      g.beginPath();
      g.moveTo(frontX + bx, frontY + by);
      g.lineTo(frontX + bx + Math.cos(baseAngle) * clawLen, frontY + by + Math.sin(baseAngle) * clawLen);
      g.strokePath();

      // Claw tip curve
      g.lineStyle(3, 0xcc6644, 1);
      g.beginPath();
      g.moveTo(frontX + bx + Math.cos(baseAngle) * clawLen, frontY + by + Math.sin(baseAngle) * clawLen);
      g.lineTo(frontX + bx + Math.cos(tipAngle) * (clawLen + 6), frontY + by + Math.sin(tipAngle) * (clawLen + 6));
      g.strokePath();
    };

    drawClaw(1);
    drawClaw(-1);

    // Pulse red glow when locked
    if (this.crushGrabActive) {
      g.lineStyle(2, 0xff2200, 0.4 + 0.4 * Math.sin(Date.now() / 150));
      g.strokeCircle(frontX, frontY, 12);
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
    if (this._statusLabel) this._statusLabel.setPosition(this.x, this.y + 38);
    if (!this.crushGrabActive) this._updateClawGfx();
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this._statusLabel) this._statusLabel.destroy();
    if (this._clawGfx) this._clawGfx.destroy();
    super.destroy(fromScene);
  }
}
