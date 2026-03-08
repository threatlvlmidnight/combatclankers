class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.matchDuration = 180000;
    this.matchTimer = this.matchDuration;
    this.gameOver = false;
  }

  init(data) {
    this.playerBotKey = data?.playerBotKey || 'crusher';
    this.aiBotKey = data?.aiBotKey || 'rampage';
    this.isOnline = data?.isOnline || false;
    this.isHost = data?.isHost || false;
    this._clientInput = { u: 0, d: 0, l: 0, r: 0 };
    this._stateTimer = 0;
    this._inputTimer = 0;
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

    if (this.isOnline) {
      NET.onMessage(msg => this._onNetMessage(msg));
      NET.onClose(() => this._onDisconnect());
    }
  }

  createArena() {
    this.arenaX = 35;
    this.arenaY = 78;
    this.arenaW = 830;
    this.arenaH = 530;
    const cx = this.arenaX + this.arenaW / 2;
    const cy = this.arenaY + this.arenaH / 2;
    const wallThick = 22;

    const g = this.add.graphics();

    // Floor
    g.fillStyle(0x1e1e30, 1);
    g.fillRect(this.arenaX, this.arenaY, this.arenaW, this.arenaH);

    // Grid
    g.lineStyle(1, 0x2a2a50, 0.6);
    for (let x = this.arenaX; x <= this.arenaX + this.arenaW; x += 55) {
      g.beginPath(); g.moveTo(x, this.arenaY); g.lineTo(x, this.arenaY + this.arenaH); g.strokePath();
    }
    for (let y = this.arenaY; y <= this.arenaY + this.arenaH; y += 55) {
      g.beginPath(); g.moveTo(this.arenaX, y); g.lineTo(this.arenaX + this.arenaW, y); g.strokePath();
    }

    // Pit in bottom-right corner
    const pitW = 130;
    const pitH = 130;
    const pitX = this.arenaX + this.arenaW - wallThick - pitW / 2;
    const pitY = this.arenaY + this.arenaH - wallThick - pitH / 2;

    // Pit danger border (red glow in corner)
    g.fillStyle(0x880000, 0.7);
    g.fillRect(pitX - pitW / 2 - 6, pitY - pitH / 2 - 6, pitW + 12, pitH + 12);

    // Pit floor
    g.fillStyle(0x000000, 1);
    g.fillRect(pitX - pitW / 2, pitY - pitH / 2, pitW, pitH);

    // Pit warning stripes
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 === 0 ? 0xff0000 : 0x000000, 0.25);
      g.fillRect(pitX - pitW / 2 + i * 16, pitY - pitH / 2, 16, pitH);
    }

    // Pit depth effect
    g.fillStyle(0x330000, 0.5);
    g.fillRect(pitX - pitW / 2 + 8, pitY - pitH / 2 + 8, pitW - 16, pitH - 16);

    // Pit label
    this.add.text(pitX, pitY, 'PIT', {
      fontSize: '18px', color: '#ff3333', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1);

    // Corner danger indicator (arrow pointing toward pit)
    this.add.text(pitX - pitW / 2 - 30, pitY - pitH / 2 - 22, '▼►', {
      fontSize: '14px', color: '#ff4444', fontFamily: 'monospace'
    }).setDepth(1);

    // Walls (static physics bodies)
    const wallColor = 0x556677;
    this.walls = this.physics.add.staticGroup();

    const addWall = (wx, wy, ww, wh) => {
      const rect = this.add.rectangle(wx, wy, ww, wh, wallColor).setDepth(2);
      this.walls.add(rect);
      const hi = this.add.graphics().setDepth(3);
      hi.lineStyle(2, 0x8899aa, 0.8);
      hi.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    };

    addWall(cx, this.arenaY + wallThick / 2, this.arenaW, wallThick);
    addWall(cx, this.arenaY + this.arenaH - wallThick / 2, this.arenaW, wallThick);
    addWall(this.arenaX + wallThick / 2, cy, wallThick, this.arenaH);
    addWall(this.arenaX + this.arenaW - wallThick / 2, cy, wallThick, this.arenaH);
    this.walls.refresh(); // sync all static bodies

    // World bounds = inner arena edge — prevents bots being pushed through walls by other bots
    this.physics.world.setBounds(
      this.arenaX + wallThick, this.arenaY + wallThick,
      this.arenaW - wallThick * 2, this.arenaH - wallThick * 2
    );

    // Pit zone (overlap trigger)
    this.pitZone = this.add.zone(pitX, pitY, pitW, pitH);
    this.physics.add.existing(this.pitZone, true);

    this.pitX = pitX;
    this.pitY = pitY;
    this.pitW = pitW;
    this.pitH = pitH;
  }

  createBots() {
    const playerDef = BOT_ROSTER.find(b => b.key === this.playerBotKey) || BOT_ROSTER[0];
    const aiDef = BOT_ROSTER.find(b => b.key === this.aiBotKey) || BOT_ROSTER[1] || BOT_ROSTER[0];
    this.playerBotDef = playerDef;
    this.aiBotDef = aiDef;
    this.playerBot = new playerDef.botClass(this, 150, 343);
    this.aiBot = new aiDef.botClass(this, 680, 200);
    // Override constructor rotations so bots always face each other regardless of which bot was picked
    this.playerBot.setRotation(0);       // left side faces right
    this.aiBot.setRotation(Math.PI);     // right side faces left
    this.playerBot.setCollideWorldBounds(true);
    this.aiBot.setCollideWorldBounds(true);
    if (!this.isOnline) {
      this.botAI = new BotAI(this.aiBot, this.playerBot, { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH });
    }
  }

  createControls() {
    this.keys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      primaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      secondaryFire: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
  }

  setupPhysics() {
    this.physics.add.collider(this.playerBot, this.walls);
    this.physics.add.collider(this.aiBot, this.walls);
    this.physics.add.collider(this.playerBot, this.aiBot, this.handleBotCollision, null, this);
    this.physics.add.overlap(this.playerBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.playerBot, 'pit'); });
    this.physics.add.overlap(this.aiBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.aiBot, 'pit'); });
  }

  handleBotCollision(bot1, bot2) {
    if (this.gameOver) return;
    if (this.isOnline && !this.isHost) return;
    const dvx = bot1.body.velocity.x - bot2.body.velocity.x;
    const dvy = bot1.body.velocity.y - bot2.body.velocity.y;
    const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy);
    if (relSpeed < GAME_CONFIG.collision.minRelSpeed) return;

    const baseDamage = relSpeed * GAME_CONFIG.collision.damageMultiplier;
    const zone1 = this.getHitZone(bot2, bot1);
    const zone2 = this.getHitZone(bot1, bot2);

    // Helper: bypass SpinnerBot's takeDamage override (which resets spinEnergy)
    // so self-damage doesn't zero out the spin before the hit is registered
    const bypassTakeDamage = (bot, amount) => Bot.prototype.takeDamage.call(bot, amount, 'side');

    // Spinner impact: energy-scaled damage mult + knockback + self-damage
    const applySpinner = (spinner, victim) => {
      if (!spinner.spinnerActive || !(spinner.spinEnergy > 0)) return 1.0;
      const ratio = spinner.spinEnergy / 100;
      const mult = GAME_CONFIG.weapons.spinnerMultiplier * ratio;

      // Knockback impulse on victim
      const kb = GAME_CONFIG.spinners.knockbackBase * ratio;
      const angle = Math.atan2(victim.y - spinner.y, victim.x - spinner.x);
      victim.body.setVelocity(Math.cos(angle) * kb, Math.sin(angle) * kb);

      // Self-damage on spinner (bypass override so spinEnergy reset happens after)
      bypassTakeDamage(spinner, baseDamage * mult * GAME_CONFIG.spinners.selfDamageRatio);
      // Recoil
      spinner.body.setVelocity(Math.cos(angle + Math.PI) * kb * 0.3, Math.sin(angle + Math.PI) * kb * 0.3);

      // Impact text
      if (ratio > 0.5) {
        this.showImpactText(victim.x, victim.y - 30, ratio >= 0.9 ? 'KAPOW!' : 'WHAM!', '#ffcc00');
      }

      return mult;
    };

    // bot2 might be the spinner hitting bot1, and vice versa
    const mult1 = applySpinner(bot2, bot1);
    const mult2 = applySpinner(bot1, bot2);

    bot1.takeDamage(baseDamage * (bot2.spinnerActive ? mult1 : 1.0), zone1);
    bot2.takeDamage(baseDamage * (bot1.spinnerActive ? mult2 : 1.0), zone2);

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

    this.events.emit('gameOver', { winner, reason, isOnline: this.isOnline, isHost: this.isHost });

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason });

    // Solo: auto-return after 3s. Online: UIScene shows Play Again / Main Menu buttons.
    if (!this.isOnline) {
      this.time.delayedCall(3000, () => {
        this.scene.stop('UIScene');
        this.scene.start('MainMenuScene', { result: { winner, reason, playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
      });
    }
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

  showImpactText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontSize: '22px', color, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 650,
      ease: 'Power2',
      onComplete: () => t.destroy()
    });
  }

  update(time, delta) {
    if (this.gameOver) return;

    // Only host (or solo) owns the timer
    if (!this.isOnline || this.isHost) {
      this.matchTimer -= delta;
      if (this.matchTimer <= 0) { this.timeUp(); return; }
    }

    this.events.emit('timerUpdate', this.matchTimer);

    if (!this.isOnline) {
      this.updatePlayerMovement();
      this.playerBot.updateWeapon?.(this.keys, delta, this.aiBot);
      this.botAI.update(delta);
    } else if (this.isHost) {
      this.updatePlayerMovement();
      this.playerBot.updateWeapon?.(this.keys, delta, this.aiBot);
      this._applyClientInput(delta);
      this._stateTimer += delta;
      if (this._stateTimer >= 50) { this._stateTimer = 0; this._sendState(); }
    } else {
      // Client: send inputs (throttled ~20 Hz), zero velocities (host owns physics)
      this._inputTimer += delta;
      if (this._inputTimer >= 50) { this._inputTimer = 0; this._sendInput(); }
      if (this.playerBot?.body) { this.playerBot.body.setVelocity(0, 0); this.playerBot.setAngularVelocity(0); }
      if (this.aiBot?.body) { this.aiBot.body.setVelocity(0, 0); this.aiBot.setAngularVelocity(0); }
    }
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
    this.events.emit('gameOver', { winner, reason: 'time', isOnline: this.isOnline, isHost: this.isHost });

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason: 'time' });

    if (!this.isOnline) {
      this.time.delayedCall(3000, () => {
        this.scene.stop('UIScene');
        this.scene.start('MainMenuScene', { result: { winner, reason: 'time', playerBotName: this.playerBotDef?.name, aiBotName: this.aiBotDef?.name } });
      });
    }
  }

  // HOST: apply stored client input to aiBot
  _applyClientInput(delta) {
    const bot = this.aiBot;
    const inp = this._clientInput;
    if (inp.l) bot.setAngularVelocity(-bot.rotationSpeed);
    else if (inp.r) bot.setAngularVelocity(bot.rotationSpeed);
    else bot.setAngularVelocity(0);
    if (inp.u) {
      bot.body.setVelocity(Math.cos(bot.rotation) * bot.botSpeed, Math.sin(bot.rotation) * bot.botSpeed);
    } else if (inp.d) {
      bot.body.setVelocity(-Math.cos(bot.rotation) * bot.botSpeed * 0.65, -Math.sin(bot.rotation) * bot.botSpeed * 0.65);
    } else {
      bot.body.setVelocity(bot.body.velocity.x * 0.87, bot.body.velocity.y * 0.87);
    }
    bot.updateWeapon?.({ primaryFire: { isDown: !!inp.j } }, delta, this.playerBot);
  }

  // CLIENT: read local WASD and send as input packet
  _sendInput() {
    const k = this.keys;
    NET.send({ type: 'input', u: k.up.isDown?1:0, d: k.down.isDown?1:0, l: k.left.isDown?1:0, r: k.right.isDown?1:0, j: k.primaryFire.isDown?1:0 });
  }

  // HOST: send authoritative game state to client at 20 Hz
  _sendState() {
    const p = this.playerBot, a = this.aiBot;
    NET.send({
      type: 'state',
      p: {
        x: p.x, y: p.y, rot: p.rotation, hp: p.hp, driveHP: p.driveHP,
        sa: p.spinnerActive || false, sang: p.spinnerAngle || 0, sen: p.spinEnergy || 0,
        hs: p.hammerSwinging || false, ha: p._hammerAngle ?? -0.9, sg: p._swingGlow || false,
        fc: p.flipCharge ?? 100, fa: p._flipArmAngle || 0,
      },
      a: {
        x: a.x, y: a.y, rot: a.rotation, hp: a.hp, driveHP: a.driveHP,
        sa: a.spinnerActive || false, sang: a.spinnerAngle || 0, sen: a.spinEnergy || 0,
        hs: a.hammerSwinging || false, ha: a._hammerAngle ?? -0.9, sg: a._swingGlow || false,
        fc: a.flipCharge ?? 100, fa: a._flipArmAngle || 0,
      },
      timer: this.matchTimer
    });
  }

  // CLIENT: apply weapon state from network packet to a bot and refresh its graphics
  _applyWeaponState(bot, d) {
    if (bot.spinnerActive !== undefined) {
      bot.spinnerActive = d.sa;
      bot.spinnerAngle = d.sang;
      bot.spinEnergy = d.sen ?? 0;
      if (bot._statusLabel) {
        if (d.sa) {
          const pct = Math.floor(d.sen || 0);
          bot._statusLabel.setText(`SPIN: ${pct}%${pct >= 100 ? ' ★' : ''}`);
          bot._statusLabel.setColor('#44ff88');
        } else {
          bot._statusLabel.setText('SPIN: OFF').setColor('#226633');
        }
      }
      bot._updateSpinnerGfx?.();
    }
    if (bot._hammerAngle !== undefined) {
      const wasSwinging = bot.hammerSwinging;
      bot.hammerSwinging = d.hs;
      bot._hammerAngle = d.ha;
      bot._swingGlow = d.sg;
      if (wasSwinging !== d.hs && bot._statusLabel) {
        bot._statusLabel.setText(d.hs ? 'SWINGING!' : 'HAMMER READY');
        bot._statusLabel.setColor(d.hs ? '#ffaa22' : '#886622');
      }
      bot._updateHammerGfx?.();
    }
    if (bot.flipCharge !== undefined) {
      bot.flipCharge = d.fc ?? 100;
      bot._flipArmAngle = d.fa || 0;
      bot._updateFlipperGfx?.();
      bot._updateStatusLabel?.();
    }
  }

  // Dispatch incoming network messages
  _onNetMessage(msg) {
    if (this.isHost) {
      if (msg.type === 'input') { const { u, d, l, r, j } = msg; this._clientInput = { u, d, l, r, j }; }
    } else {
      if (msg.type === 'state') {
        this.playerBot.setPosition(msg.p.x, msg.p.y);
        this.playerBot.setRotation(msg.p.rot);
        this.playerBot.hp = msg.p.hp;
        this.playerBot.driveHP = msg.p.driveHP;
        this._applyWeaponState(this.playerBot, msg.p);
        this.aiBot.setPosition(msg.a.x, msg.a.y);
        this.aiBot.setRotation(msg.a.rot);
        this.aiBot.hp = msg.a.hp;
        this.aiBot.driveHP = msg.a.driveHP;
        this._applyWeaponState(this.aiBot, msg.a);
        this.matchTimer = msg.timer;
      } else if (msg.type === 'go') {
        this._onRemoteGameOver(msg);
      }
    }
  }

  // CLIENT: host signaled game over
  _onRemoteGameOver(msg) {
    if (this.gameOver) return;
    this.gameOver = true;
    // Client always isHost=false; UIScene will show Play Again / Main Menu buttons
    this.events.emit('gameOver', { winner: msg.winner, reason: msg.reason, isOnline: true, isHost: false });
  }

  // Peer disconnected mid-match
  _onDisconnect() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.events.emit('gameOver', { winner: 'Player', reason: 'disconnect' });
    this.time.delayedCall(2000, () => {
      this.scene.stop('UIScene');
      NET.destroy();
      this.scene.start('MainMenuScene', {});
    });
  }
}
