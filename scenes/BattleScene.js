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
    this._countdownActive = false;  // don't start until both players ready
    this._countdownRemaining = 3000; // 3 seconds in ms
    this._countdownStarted = false;  // track if countdown has started broadcasting
    this._playerMovedEarly = false;  // did player cheat by moving early?
    this._aiMovedEarly = false;      // did ai cheat by moving early?
    this._playerZoneBounds = null;   // starting zone for player
    this._aiZoneBounds = null;       // starting zone for ai
    this._startingZoneSize = 80;     // size of each starting zone square
    this._playerReady = false;       // player clicked ready
    this._aiReady = !this.isOnline;  // AI is auto-ready in solo, waits for client signal online
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

    // Create countdown display
    this.countdownText = this.add.text(450, 325, '3', {
      fontSize: '120px', color: '#ff6633', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    // Create starting zone squares (hidden until countdown)
    this._playerZoneGraphic = this.add.rectangle(
      this._playerZoneBounds.x, this._playerZoneBounds.y,
      this._startingZoneSize, this._startingZoneSize,
      0xff6633, 0.15
    ).setStrokeStyle(2, 0xff6633).setDepth(50).setVisible(false);
    
    this._aiZoneGraphic = this.add.rectangle(
      this._aiZoneBounds.x, this._aiZoneBounds.y,
      this._startingZoneSize, this._startingZoneSize,
      0x3366ff, 0.15
    ).setStrokeStyle(2, 0x3366ff).setDepth(50).setVisible(false);

    // Create READY buttons
    const readyBtnX = 150, readyBtnY = 580;
    const aiReadyBtnX = 680, aiReadyBtnY = 80;
    
    this._playerReadyBtn = this.add.text(readyBtnX, readyBtnY, 'READY?', {
      fontSize: '20px', color: '#ff6633', fontFamily: 'Arial Black', fontStyle: 'bold',
      backgroundColor: '#1a1a1a', padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setDepth(105).setInteractive({ useHandCursor: true });
    this._playerReadyBtn.on('pointerdown', () => this._onPlayerReady());
    
    this._aiReadyBtn = this.add.text(aiReadyBtnX, aiReadyBtnY, 'READY?', {
      fontSize: '20px', color: '#3366ff', fontFamily: 'Arial Black', fontStyle: 'bold',
      backgroundColor: '#1a1a1a', padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setDepth(105).setInteractive({ useHandCursor: true });
    this._aiReadyBtn.on('pointerdown', () => this._onAiReady());

    if (!this.isOnline) {
      // Solo: AI button auto-clicks after small delay
      this.time.delayedCall(500, () => this._onAiReady());
    }

    if (this.isOnline) {
      NET.onMessage(msg => this._onNetMessage(msg));
      NET.onClose(() => this._onDisconnect());
    }

    // Listen for UIScene navigation requests.
    // BattleScene owns transitions because scene.start() from a started scene
    // properly stops itself, whereas scene.start() from a launched scene (UIScene)
    // leaves BattleScene running and blocks the transition.
    this.events.on('returnToMenu', (result) => {
      console.log('[BattleScene] returnToMenu received, result:', result);
      console.log('[BattleScene] scene status:', this.scene.settings.status);
      console.log('[BattleScene] UIScene active:', this.scene.isActive('UIScene'));
      try {
        this.scene.stop('UIScene');
        console.log('[BattleScene] UIScene stopped');
        
        // For online matches with custom opponent bot, show bot reward screen
        if (this.isOnline && this.aiBotDef?.isOpponentBot) {
          console.log('[BattleScene] Showing BotRewardScene for opponent bot:', this.aiBotDef.key);
          this.scene.start('BotRewardScene', {
            opponentBotDef: this.aiBotDef,
            matchResult: result,
            onDone: () => {
              this.scene.start('MainMenuScene', { result });
            }
          });
        } else {
          this.scene.start('MainMenuScene', { result });
        }
        console.log('[BattleScene] Scene transition initiated');
      } catch (e) {
        console.error('[BattleScene] TRANSITION ERROR:', e);
      }
    });
    this.events.on('returnToMainMenu', () => {
      console.log('[BattleScene] returnToMainMenu received');
      try {
        NET.destroy();
        this.scene.stop('UIScene');
        this.scene.start('MainMenuScene');
      } catch (e) {
        console.error('[BattleScene] TRANSITION ERROR:', e);
      }
    });
    this.events.on('returnToOnlineSelect', (opts) => {
      console.log('[BattleScene] returnToOnlineSelect received');
      try {
        this.scene.stop('UIScene');
        this.scene.start('OnlineBotSelectScene', opts);
      } catch (e) {
        console.error('[BattleScene] TRANSITION ERROR:', e);
      }
    });
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
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER, ...OPPONENT_ROSTER];
    let playerDef = allBots.find(b => b.key === this.playerBotKey);
    let aiDef = allBots.find(b => b.key === this.aiBotKey);
    
    // Fallback to defaults if not found
    if (!playerDef) {
      console.warn(`[BattleScene] Player bot "${this.playerBotKey}" not found, using default`);
      playerDef = BOT_ROSTER[0];
    }
    if (!aiDef) {
      console.warn(`[BattleScene] AI bot "${this.aiBotKey}" not found, using default`);
      aiDef = BOT_ROSTER[1] || BOT_ROSTER[0];
    }
    
    this.playerBotDef = playerDef;
    this.aiBotDef = aiDef;
    
    // For online CLIENT, swap bot positions: CLIENT controls bot on right
    let playerX = 150, playerY = 343, aiX = 680, aiY = 200;
    let playerRot = 0, aiRot = Math.PI;
    
    console.log('[BattleScene] createBots check:', { isOnline: this.isOnline, isHost: this.isHost, willSwap: this.isOnline && !this.isHost });
    
    if (this.isOnline && !this.isHost) {
      // CLIENT: player on right, opponent on left
      playerX = 680; playerY = 200;
      aiX = 150; aiY = 343;
      playerRot = Math.PI; aiRot = 0;
      console.log('[BattleScene] CLIENT BOT SWAP APPLIED');
    }
    
    // Store starting zone bounds for countdown validation
    const zoneHalf = this._startingZoneSize / 2;
    this._playerZoneBounds = { x: playerX, y: playerY, half: zoneHalf };
    this._aiZoneBounds = { x: aiX, y: aiY, half: zoneHalf };
    
    console.log('[BattleScene] Creating bots at:', { playerX, playerY, aiX, aiY });
    console.log('[BattleScene] Starting zones:', { playerZone: this._playerZoneBounds, aiZone: this._aiZoneBounds });
    
    this.playerBot = new playerDef.botClass(this, playerX, playerY, playerDef);
    this.aiBot = new aiDef.botClass(this, aiX, aiY, aiDef);
    
    // Set rotations so bots always face each other
    this.playerBot.setRotation(playerRot);
    this.aiBot.setRotation(aiRot);
    this.playerBot.setCollideWorldBounds(true);
    this.aiBot.setCollideWorldBounds(true);
    
    if (!this.isOnline) {
      this.botAI = new BotAI(this.aiBot, this.playerBot, { x: this.pitX, y: this.pitY, w: this.pitW, h: this.pitH });
    }
    
    console.log('[BattleScene] Bots created:', {
      playerBot: { key: this.playerBotKey, name: playerDef.name, x: this.playerBot.x, y: this.playerBot.y },
      aiBot: { key: this.aiBotKey, name: aiDef.name, x: this.aiBot.x, y: this.aiBot.y },
      isOnline: this.isOnline,
      isHost: this.isHost
    });
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
    this.physics.add.collider(this.playerBot, this.walls, () => this.handleWallCollision(this.playerBot));
    this.physics.add.collider(this.aiBot, this.walls, () => this.handleWallCollision(this.aiBot));
    this.physics.add.collider(this.playerBot, this.aiBot, this.handleBotCollision, null, this);
    this.physics.add.overlap(this.playerBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.playerBot, 'pit'); });
    this.physics.add.overlap(this.aiBot, this.pitZone, () => { if (!this.isOnline || this.isHost) this.knockOut(this.aiBot, 'pit'); });
  }

  handleWallCollision(bot) {
    // Stop spinner on wall collision
    if (bot.spinnerActive) {
      bot.spinnerActive = false;
      bot.spinEnergy = 0;
      if (bot._statusLabel) {
        bot._statusLabel.setText('SPIN: OFF').setColor('#226633');
      }
      console.log('[BattleScene] Spinner hit wall and stopped:', bot.key);
    }
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
      let mult = GAME_CONFIG.weapons.spinnerMultiplier * ratio;

      // MASSIVE BONUS for fully charged spinner (>95% energy) - like real BattleBots
      if (ratio >= 0.95) {
        mult *= 2.0; // DOUBLE damage on near-perfect charge
      } else if (ratio > 0.90) {
        // Already high energy bonus
        mult *= 1.5; // 50% bonus for 90-95% charge
      } else if (ratio > 0.70) {
        // Medium charge bonus
        mult *= 1.15; // 15% bonus for 70-90% charge
      }

      // Knockback impulse on victim (scales with energy)
      const kb = GAME_CONFIG.spinners.knockbackBase * ratio;
      const angle = Math.atan2(victim.y - spinner.y, victim.x - spinner.x);
      victim.body.setVelocity(Math.cos(angle) * kb, Math.sin(angle) * kb);

      // Self-damage on spinner (bypass override so spinEnergy reset happens after)
      bypassTakeDamage(spinner, baseDamage * mult * GAME_CONFIG.spinners.selfDamageRatio);
      // Recoil
      spinner.body.setVelocity(Math.cos(angle + Math.PI) * kb * 0.3, Math.sin(angle + Math.PI) * kb * 0.3);

      // Impact text
      if (ratio >= 0.95) {
        this.showImpactText(victim.x, victim.y - 30, 'OBLITERATED!', '#ff0000');
      } else if (ratio >= 0.9) {
        this.showImpactText(victim.x, victim.y - 30, 'DEVASTATED!', '#ffaa00');
      } else if (ratio > 0.5) {
        this.showImpactText(victim.x, victim.y - 30, 'WHAM!', '#ffcc00');
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

    const gameOverData = { 
      winner, 
      reason, 
      isOnline: this.isOnline, 
      isHost: this.isHost,
      playerBotName: this.playerBotDef?.name || 'Player Bot',
      aiBotName: this.aiBotDef?.name || 'AI Bot'
    };
    console.log('[BattleScene] knockOut — emitting gameOver:', gameOverData);
    this.events.emit('gameOver', gameOverData);

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason });
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

    // Check if both players are ready and start countdown
    if (!this._countdownActive && this._playerReady && this._aiReady) {
      this._countdownActive = true;
      this._playerReadyBtn.setVisible(false);
      this._aiReadyBtn.setVisible(false);
      console.log('[BattleScene] Both players ready - starting countdown!');
    }

    // Handle countdown (HOST controls it and broadcasts to CLIENT)
    if (this._countdownActive) {
      if (this.isOnline && this.isHost) {
        // HOST: Send countdown state to CLIENT
        if (!this._countdownStarted) {
          this._countdownStarted = true;
          console.log('[BattleScene] HOST broadcasting countdown start');
        }
        this._stateTimer += delta;
        if (this._stateTimer >= 50) {
          this._stateTimer = 0;
          NET.send({ type: 'countdown', remaining: Math.max(0, this._countdownRemaining) });
        }
      }

      this._countdownRemaining -= delta;
      const countNum = Math.ceil(this._countdownRemaining / 1000);
      if (countNum <= 0) {
        // Countdown finished
        this._countdownActive = false;
        this.countdownText.destroy();
        this._playerZoneGraphic.setVisible(false);
        this._aiZoneGraphic.setVisible(false);
        console.log('[BattleScene] Countdown finished');
      } else {
        // Update countdown display and show zones
        this._playerZoneGraphic.setVisible(true);
        this._aiZoneGraphic.setVisible(true);
        if (countNum === 3) this.countdownText.setText('3').setColor('#ff6633');
        else if (countNum === 2) this.countdownText.setText('2').setColor('#ffaa33');
        else if (countNum === 1) this.countdownText.setText('1').setColor('#ffff33');
      }
      
      // Check for early movement or zone escape
      this._checkEarlyMovement();
      
      return; // Skip all game updates during countdown
    }

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
      this.aiBot.updateWeapon?.(this.botAI.getWeaponKeys(delta), delta, this.playerBot);
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

  _onPlayerReady() {
    if (this._playerReady) return; // Already ready
    this._playerReady = true;
    this._playerReadyBtn.setColor('#00ff00').setText('READY!');
    console.log('[BattleScene] Player marked ready');
    if (this.isOnline && this.isHost) {
      NET.send({ type: 'ready', player: 'host' });
    }
  }

  _onAiReady() {
    if (this._aiReady) return; // Already ready
    this._aiReady = true;
    this._aiReadyBtn.setColor('#00ff00').setText('READY!');
    console.log('[BattleScene] AI/Client marked ready');
    if (this.isOnline && this.isHost) {
      NET.send({ type: 'ready', player: 'client' });
    }
  }

  _checkEarlyMovement() {
    // Check if either player moved outside zone or exceeded velocity threshold
    const moveThreshold = 5; // pixels per frame of movement
    const playerVel = Math.sqrt(this.playerBot.body.velocity.x ** 2 + this.playerBot.body.velocity.y ** 2);
    const aiVel = Math.sqrt(this.aiBot.body.velocity.x ** 2 + this.aiBot.body.velocity.y ** 2);
    
    // Check player: velocity threshold OR outside zone
    const playerOutOfZone = Math.abs(this.playerBot.x - this._playerZoneBounds.x) > this._playerZoneBounds.half ||
                            Math.abs(this.playerBot.y - this._playerZoneBounds.y) > this._playerZoneBounds.half;
    if ((playerVel > moveThreshold || playerOutOfZone) && !this._playerMovedEarly) {
      console.warn('[BattleScene] PLAYER moved before countdown finished - FORFEIT', { vel: playerVel, outOfZone: playerOutOfZone });
      this._playerMovedEarly = true;
      // Immediately end game: AI wins
      if (this.isOnline && this.isHost) {
        this._endMatchEarly('AI', 'early_movement_forfeit');
      } else if (!this.isOnline) {
        this._endMatchEarly('AI', 'early_movement_forfeit');
      }
    }
    
    // Check AI: velocity threshold OR outside zone
    const aiOutOfZone = Math.abs(this.aiBot.x - this._aiZoneBounds.x) > this._aiZoneBounds.half ||
                        Math.abs(this.aiBot.y - this._aiZoneBounds.y) > this._aiZoneBounds.half;
    if ((aiVel > moveThreshold || aiOutOfZone) && !this._aiMovedEarly) {
      console.warn('[BattleScene] AI moved before countdown finished - FORFEIT', { vel: aiVel, outOfZone: aiOutOfZone });
      this._aiMovedEarly = true;
      // Immediately end game: Player wins
      if (this.isOnline && this.isHost) {
        this._endMatchEarly('Player', 'early_movement_forfeit');
      } else if (!this.isOnline) {
        this._endMatchEarly('Player', 'early_movement_forfeit');
      }
    }
  }

  _endMatchEarly(winner, reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    console.log(`[BattleScene] Match ended early: ${winner} wins (${reason})`);
    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason });
    this.events.emit('gameOver', { winner, reason, isOnline: this.isOnline, isHost: this.isHost });
  }

  timeUp() {
    if (this.gameOver) return;
    this.gameOver = true;
    const winner = this.playerBot.hp >= this.aiBot.hp ? 'Player' : 'AI';
    this.events.emit('gameOver', { winner, reason: 'time', isOnline: this.isOnline, isHost: this.isHost });

    if (this.isOnline && this.isHost) NET.send({ type: 'go', winner, reason: 'time' });

    // Solo: UIScene shows MAIN MENU button. Online: UIScene shows Play Again / Main Menu buttons.
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

  // Broadcast a weapon activation to the opponent for animation sync
  broadcastWeaponFire(weaponType, targetBotKey, params = {}) {
    if (this.isOnline && this.isHost) {
      NET.send({
        type: 'weaponFire',
        weapon: weaponType,
        target: targetBotKey,
        ...params
      });
    }
  }

  // Broadcast a weapon animation trigger to replay on opponent's scene
  broadcastWeaponAnimation(weaponType, data) {
    if (this.isOnline && this.isHost) {
      console.log('[BattleScene] Broadcasting weapon animation:', { type: weaponType, data });
      NET.send({
        type: 'weaponAnimation',
        weapon: weaponType,
        data
      });
    } else if (!this.isOnline) {
      console.log('[BattleScene] Not online, skipping animation broadcast');
    } else if (!this.isHost) {
      console.log('[BattleScene] Not host, skipping animation broadcast');
    }
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
        cg: p.crushGrabActive || false,
      },
      a: {
        x: a.x, y: a.y, rot: a.rotation, hp: a.hp, driveHP: a.driveHP,
        sa: a.spinnerActive || false, sang: a.spinnerAngle || 0, sen: a.spinEnergy || 0,
        hs: a.hammerSwinging || false, ha: a._hammerAngle ?? -0.9, sg: a._swingGlow || false,
        fc: a.flipCharge ?? 100, fa: a._flipArmAngle || 0,
        cg: a.crushGrabActive || false,
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
    if (bot.crushGrabActive !== undefined) {
      const wasGrabbed = bot.crushGrabActive;
      bot.crushGrabActive = d.cg;
      bot._clawAngle = d.cg ? 0.05 : (bot._clawAngle ?? 0.5);
      if (wasGrabbed !== d.cg && bot._statusLabel) {
        bot._statusLabel.setText(d.cg ? 'JAWS: LOCKED!' : 'JAWS: OPEN');
        bot._statusLabel.setColor(d.cg ? '#ff4422' : '#884422');
      }
      bot._updateClawGfx?.();
    }
  }

  // CLIENT: replay a weapon animation that was triggered on the host
  _playRemoteWeaponAnimation(weaponType, data) {
    console.log('[BattleScene] Received weapon animation:', { weaponType, targetKey: data.targetBotKey, chargeRatio: data.chargeRatio });
    
    // For CLIENT, swap the target bot since positions are swapped
    // HOST's aiBot (target) = CLIENT's playerBot
    let targetBot = this.aiBot;
    if (!this.isHost && data.targetBotKey === 'aiBot') {
      targetBot = this.playerBot;  // HOST targeted their aiBot, which is our playerBot
      console.log('[BattleScene] CLIENT swapped animation target from aiBot to playerBot');
    }
    
    console.log('[BattleScene] Playing animation on bot:', { botX: targetBot.x, botY: targetBot.y, botKey: targetBot.key });
    if (!targetBot?.active) {
      console.warn('[BattleScene] Target bot not active, skipping animation');
      return;
    }

    if (weaponType === 'flipper' && data.chargeRatio !== undefined) {
      // Replay flipper animation
      const chargeRatio = data.chargeRatio;
      const airtime = 300 + chargeRatio * 800;
      const peakScale = 1 + 0.5 * chargeRatio;
      const spinDir = data.spinDir || 1;

      console.log('[BattleScene] Starting flipper animation tween:', { 
        botPos: { x: targetBot.x, y: targetBot.y }, 
        chargeRatio, 
        spinDir, 
        airtime, 
        peakScale 
      });

      targetBot.setAngularVelocity(spinDir * 700 * chargeRatio);

      // Phase 1: rise
      this.tweens.add({
        targets: targetBot,
        scaleX: peakScale,
        scaleY: peakScale,
        duration: airtime * 0.4,
        ease: 'Sine.easeOut',
        onComplete: () => {
          console.log('[BattleScene] Flipper animation phase 1 complete (rising)');
          if (!targetBot.active) return;
          // Phase 2: fall
          this.tweens.add({
            targets: targetBot,
            scaleX: 1,
            scaleY: 1,
            duration: airtime * 0.6,
            ease: 'Sine.easeIn',
            onComplete: () => {
              console.log('[BattleScene] Flipper animation phase 2 complete (falling)');
              if (!targetBot.active) return;
              targetBot.setAngularVelocity(0);
              targetBot.setScale(1);
              const shakeStr = chargeRatio >= 0.85 ? 0.009 : 0.005;
              if (chargeRatio >= 0.4) this.cameras.main.shake(60, shakeStr);
              if (this.showImpactText && chargeRatio >= 0.4) {
                const landText = chargeRatio >= 0.85 ? 'CRASH!' : 'THUD!';
                const landColor = chargeRatio >= 0.85 ? '#ff4400' : '#cc7722';
                this.showImpactText(targetBot.x, targetBot.y - 16, landText, landColor);
              }
            }
          });
        }
      });

      if (this.showImpactText) {
        if (chargeRatio >= 0.85) {
          this.showImpactText(targetBot.x, targetBot.y - 20, 'FWOOSH!', '#ff8800');
          this.cameras.main.shake(80, 0.007);
        } else if (chargeRatio >= 0.4) {
          this.showImpactText(targetBot.x, targetBot.y - 20, 'WHOMP!', '#886600');
        } else {
          this.showImpactText(targetBot.x, targetBot.y - 14, 'thwp!', '#666666');
        }
      }
    }
  }

  // Dispatch incoming network messages
  _onNetMessage(msg) {
    if (this.isHost) {
      if (msg.type === 'input') { const { u, d, l, r, j } = msg; this._clientInput = { u, d, l, r, j }; }
      if (msg.type === 'ready') {
        // HOST receives ready signal from CLIENT
        if (msg.player === 'client') {
          this._aiReady = true;
          this._aiReadyBtn.setColor('#00ff00').setText('READY!');
          console.log('[BattleScene] HOST: Client sent ready signal');
        }
      }
    } else {
      if (msg.type === 'countdown') {
        // CLIENT: receive countdown timing from HOST
        this._countdownRemaining = msg.remaining;
      } else if (msg.type === 'state') {
        // CLIENT: receive countdown timing from HOST
        this._countdownRemaining = msg.remaining;
      } else if (msg.type === 'state') {
        // CLIENT: msg.p is HOST's playerBot (opponent), msg.a is HOST's aiBot (our bot from host's view)
        // After the key swap, HOST's aiBot = CLIENT's playerBot
        this.playerBot.setPosition(msg.a.x, msg.a.y);
        this.playerBot.setRotation(msg.a.rot);
        this.playerBot.hp = msg.a.hp;
        this.playerBot.driveHP = msg.a.driveHP;
        this._applyWeaponState(this.playerBot, msg.a);
        
        // msg.p is HOST's playerBot, which appears as CLIENT's aiBot (opponent on left)
        this.aiBot.setPosition(msg.p.x, msg.p.y);
        this.aiBot.setRotation(msg.p.rot);
        this.aiBot.hp = msg.p.hp;
        this.aiBot.driveHP = msg.p.driveHP;
        this._applyWeaponState(this.aiBot, msg.p);
        this.matchTimer = msg.timer;
      } else if (msg.type === 'weaponAnimation') {
        this._playRemoteWeaponAnimation(msg.weapon, msg.data);
      } else if (msg.type === 'go') {
        this._onRemoteGameOver(msg);
      }
    }
  }

  // CLIENT: host signaled game over
  _onRemoteGameOver(msg) {
    if (this.gameOver) return;
    this.gameOver = true;
    // CLIENT: Swap winner interpretation because positions are swapped
    // HOST's 'Player' = CLIENT's 'AI' (opponent on left)
    // HOST's 'AI' = CLIENT's 'Player' (self on right)
    const clientWinner = msg.winner === 'Player' ? 'AI' : 'Player';
    console.log('[BattleScene] CLIENT received game over:', { hostWinner: msg.winner, clientWinner });
    this.events.emit('gameOver', { winner: clientWinner, reason: msg.reason, isOnline: true, isHost: false });
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
