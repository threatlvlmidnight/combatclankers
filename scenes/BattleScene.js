class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.matchDuration = 180000;
    this.matchTimer = this.matchDuration;
    this.gameOver = false;
  }

  create() {
    this.gameOver = false;
    this.matchTimer = this.matchDuration;

    this.createArena();
    this.createBots();
    this.createControls();
    this.setupPhysics();
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
    this.scene.launch('UIScene');
  }

  createArena() {
    this.arenaX = 100;
    this.arenaY = 75;
    this.arenaW = 700;
    this.arenaH = 500;
    const cx = this.arenaX + this.arenaW / 2;
    const cy = this.arenaY + this.arenaH / 2;

    const g = this.add.graphics();

    // Floor
    g.fillStyle(0x1e1e30, 1);
    g.fillRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);

    // Grid
    g.lineStyle(1, 0x2a2a50, 0.6);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaW; x += 50) {
      g.beginPath(); g.moveTo(x, this.arenaY); g.lineTo(x, this.arenaY + this.arenaH); g.strokePath();
    }
    for (let y = this.arenaY; y <= this.arenaY + this.arenaH; y += 50) {
      g.beginPath(); g.moveTo(this.arenaX, y); g.lineTo(this.arenaX + this.arenaW, y); g.strokePath();
    }

    // Pit danger zone border
    const pitW = 140;
    const pitH = 140;
    g.fillStyle(0x880000, 0.6);
    g.fillRect(cx - pitW / 2 - 6, cy - pitH / 2 - 6, pitW + 12, pitH + 12);

    // Pit floor
    g.fillStyle(0x000000, 1);
    g.fillRect(cx - pitW / 2, cy - pitH / 2, pitW, pitH);

    // Pit warning stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff0000 : 0x000000, 0.25);
      g.fillRect(cx - pitW / 2 + i * 18, cy - pitH / 2, 18, pitH);
    }

    // Pit depth effect (inner shadow)
    g.fillStyle(0x330000, 0.5);
    g.fillRect(cx - pitW / 2 + 8, cy - pitH / 2 + 8, pitW - 16, pitH - 16);

    // Pit label
    this.add.text(cx, cy, 'PIT', {
      fontSize: '20px', color: '#ff3333', fontFamily: 'monospace', fontStyle: 'bold', alpha: 0.8
    }).setOrigin(0.5).setDepth(1);

    // Walls (static physics bodies)
    const wallThick = 22;
    const wallColor = 0x556677;
    this.walls = this.physics.add.staticGroup();

    const addWall = (wx, wy, ww, wh) => {
      const rect = this.add.rectangle(wx, wy, ww, wh, wallColor).setDepth(2);
      this.walls.add(rect); // staticGroup creates the static body

      // Wall highlight
      const hi = this.add.graphics().setDepth(3);
      hi.lineStyle(2, 0x8899aa, 0.8);
      hi.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    };

    // Top, bottom, left, right
    addWall(cx, this.arenaY + wallThick / 2, this.arenaW, wallThick);
    addWall(cx, this.arenaY + this.arenaH - wallThick / 2, this.arenaW, wallThick);
    addWall(this.arenaX + wallThick / 2, cy, wallThick, this.arenaH);
    addWall(this.arenaX + this.arenaW - wallThick / 2, cy, wallThick, this.arenaH);

    // Pit zone (overlap trigger)
    this.pitZone = this.add.zone(cx, cy, pitW, pitH);
    this.physics.add.existing(this.pitZone, true);

    this.pitX = cx;
    this.pitY = cy;
    this.pitW = pitW;
    this.pitH = pitH;
  }

  createBots() {
    this.playerBot = new WedgeBot1(this, 230, 325);
    this.aiBot = new WedgeBot2(this, 670, 325);
    this.botAI = new BotAI(this.aiBot, this.playerBot, { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH });
  }

  createControls() {
    this.keys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      primaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      secondaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    };
  }

  setupPhysics() {
    this.physics.add.collider(this.playerBot, this.walls);
    this.physics.add.collider(this.aiBot, this.walls);
    this.physics.add.collider(this.playerBot, this.aiBot, this.handleBotCollision, null, this);
    this.physics.add.overlap(this.playerBot, this.pitZone, () => this.knockOut(this.playerBot, 'pit'));
    this.physics.add.overlap(this.aiBot, this.pitZone, () => this.knockOut(this.aiBot, 'pit'));
  }

  handleBotCollision(bot1, bot2) {
    if (this.gameOver) return;
    const dvx = bot1.body.velocity.x - bot2.body.velocity.x;
    const dvy = bot1.body.velocity.y - bot2.body.velocity.y;
    const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
    if (relSpeed < 25) return;

    const baseDamage = relSpeed * 0.07;
    const zone1 = this.getHitZone(bot2, bot1);
    const zone2 = this.getHitZone(bot1, bot2);

    bot1.takeDamage(baseDamage, zone1);
    bot2.takeDamage(baseDamage, zone2);

    this.cameras.main.shake(120, 0.006);

    if (bot1.hp <= 0) this.knockOut(bot1, 'disable');
    else if (bot2.hp <= 0) this.knockOut(bot2, 'disable');
  }

  getHitZone(attacker, target) {
    const dx = attacker.x - target.x;
    const dy = attacker.y - target.y;
    const attackAngle = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(attackAngle - target.rotation);
    if (Math.abs(diff) < Math.PI / 3) return 'front';
    if (Math.abs(diff) > Math.PI * 2 / 3) return 'rear';
    return 'side';
  }

  knockOut(bot, reason) {
    if (this.gameOver) return;
    this.gameOver = true;

    const isPlayer = bot === this.playerBot;
    const winner = isPlayer ? 'AI' : 'Player';

    this.createExplosion(bot.x, bot.y);
    bot.setActive(false).setVisible(false);
    if (bot.shadow) bot.shadow.setVisible(false);
    if (bot.nameLabel) bot.nameLabel.setVisible(false);

    this.events.emit('gameOver', { winner, reason });

    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason } });
    });
  }

  createExplosion(x, y) {
    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff, 0xff2200];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = Phaser.Math.Between(60, 180);
      const size = Phaser.Math.Between(3, 10);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const p = this.add.circle(x, y, size, color).setDepth(10);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }
    this.cameras.main.shake(300, 0.015);
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.matchTimer -= delta;
    if (this.matchTimer <= 0) {
      this.timeUp();
      return;
    }

    this.events.emit('timerUpdate', this.matchTimer);
    this.updatePlayerMovement();
    this.botAI.update(delta);
  }

  updatePlayerMovement() {
    const bot = this.playerBot;
    const keys = this.keys;

    if (keys.left.isDown) {
      bot.setAngularVelocity(-bot.rotationSpeed);
    } else if (keys.right.isDown) {
      bot.setAngularVelocity(bot.rotationSpeed);
    } else {
      bot.setAngularVelocity(0);
    }

    if (keys.up.isDown) {
      bot.body.setVelocity(
        Math.cos(bot.rotation) * bot.botSpeed,
        Math.sin(bot.rotation) * bot.botSpeed
      );
    } else if (keys.down.isDown) {
      bot.body.setVelocity(
        -Math.cos(bot.rotation) * bot.botSpeed * 0.65,
        -Math.sin(bot.rotation) * bot.botSpeed * 0.65
      );
    } else {
      bot.body.setVelocity(bot.body.velocity.x * 0.87, bot.body.velocity.y * 0.87);
    }
  }

  timeUp() {
    if (this.gameOver) return;
    this.gameOver = true;
    const winner = this.playerBot.hp >= this.aiBot.hp ? 'Player' : 'AI';
    this.events.emit('gameOver', { winner, reason: 'time' });
    this.time.delayedCall(3000, () => {
      this.scene.stop('UIScene');
      this.scene.start('MenuScene', { result: { winner, reason: 'time' } });
    });
  }
}
