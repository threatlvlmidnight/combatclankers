// scenes/BotRewardScene.js
// Offer to save opponent's bot to garage after online match

class BotRewardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BotRewardScene' });
  }

  init(data) {
    this.opponentBotDef = data?.opponentBotDef || null;
    this.matchResult = data?.matchResult || null;
    this.onDone = data?.onDone || (() => {});
  }

  create() {
    this.drawBackground();

    const cx = 450;
    let y = 100;

    // Title
    this.add.text(cx, y, 'BOT ACQUIRED!', {
      fontSize: '36px', color: '#ffcc00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    if (this.opponentBotDef) {
      y += 60;
      // Bot info
      this.add.text(cx, y, `You can now save your opponent's bot!`, {
        fontSize: '14px', color: '#aabbcc', fontFamily: 'monospace'
      }).setOrigin(0.5);

      y += 30;
      const colorHex = '#' + this.opponentBotDef.color.toString(16).padStart(6, '0');
      this.add.text(cx, y, this.opponentBotDef.name, {
        fontSize: '24px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
      }).setOrigin(0.5);

      y += 40;
      this.add.text(cx, y, this.opponentBotDef.weapon, {
        fontSize: '12px', color: '#ff8844', fontFamily: 'monospace'
      }).setOrigin(0.5);

      y += 25;
      const statsText = `Speed: ${this.opponentBotDef.stats?.speed || 75} | Armor: ${this.opponentBotDef.stats?.armor || 75} | Weapon: ${this.opponentBotDef.stats?.weapon || 75}`;
      this.add.text(cx, y, statsText, {
        fontSize: '11px', color: '#888899', fontFamily: 'monospace'
      }).setOrigin(0.5);

      y += 50;
      // Buttons
      this.makeButton(cx - 120, y, 'SAVE TO GARAGE', 0x1a7a1a, 0x2aaa2a, () => {
        this.saveBot();
      });
      this.makeButton(cx + 120, y, 'SKIP', 0x7a1a1a, 0xaa2a2a, () => {
        this.done();
      });
    } else {
      y += 60;
      this.add.text(cx, y, 'Standard bot — no save needed.', {
        fontSize: '14px', color: '#aabbcc', fontFamily: 'monospace'
      }).setOrigin(0.5);

      y += 50;
      this.makeButton(cx, y, 'CONTINUE', 0x333333, 0x555555, () => {
        this.done();
      });
    }
  }

  saveBot() {
    try {
      if (!this.opponentBotDef || !this.opponentBotDef.key) {
        console.warn('[BotRewardScene] No valid bot to save');
        return;
      }

      // Add to CUSTOM_ROSTER if not already there
      const isCustom = this.opponentBotDef.key.includes('opponent_');
      if (isCustom) {
        const existing = CUSTOM_ROSTER.find(b => b.key === this.opponentBotDef.key);
        if (!existing) {
          CUSTOM_ROSTER.push(this.opponentBotDef);
          saveCustomRoster();
          console.log('[BotRewardScene] Bot saved to garage:', this.opponentBotDef.key);
          this.add.text(450, 500, 'Bot saved to garage! ✓', {
            fontSize: '14px', color: '#44ff88', fontFamily: 'monospace'
          }).setOrigin(0.5);
          this.time.delayedCall(2000, () => this.done());
        } else {
          this.add.text(450, 500, 'Already in your garage!', {
            fontSize: '14px', color: '#ffaa44', fontFamily: 'monospace'
          }).setOrigin(0.5);
          this.time.delayedCall(2000, () => this.done());
        }
      }
    } catch (e) {
      console.error('[BotRewardScene] Error saving bot:', e);
      this.add.text(450, 500, 'Error saving bot', {
        fontSize: '14px', color: '#ff4444', fontFamily: 'monospace'
      }).setOrigin(0.5);
      this.time.delayedCall(2000, () => this.done());
    }
  }

  done() {
    clearOpponentRoster();
    if (this.onDone && typeof this.onDone === 'function') {
      try {
        this.onDone();
      } catch (e) {
        console.error('[BotRewardScene] Error calling onDone:', e);
      }
    }
    this.scene.stop();
  }

  makeButton(x, y, label, color, hoverColor, onClick) {
    const btn = this.add.rectangle(x, y, 200, 40, color).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(hoverColor); txt.setColor('#ffcc00'); });
    btn.on('pointerout', () => { btn.setFillStyle(color); txt.setColor('#ffffff'); });
    btn.on('pointerdown', onClick);
  }

  drawBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, 900, 650);
    bg.lineStyle(1, 0x111133, 0.5);
    for (let x = 0; x < 900; x += 55) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, 650); bg.strokePath();
    }
    for (let y = 0; y < 650; y += 55) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(900, y); bg.strokePath();
    }
  }
}
