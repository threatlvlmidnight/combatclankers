// scenes/OnlineBotSelectScene.js
class OnlineBotSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OnlineBotSelectScene' });
  }

  init(data) {
    this.isHost = data.isHost;
    this.selectedKey = null;
    this.opponentKey = null;
    this.cards = [];
  }

  create() {
    this.drawBackground();
    this._scrollIndex = 0;

    const roleLabel = this.isHost ? '[HOST]' : '[GUEST]';
    this.add.text(450, 40, `CHOOSE YOUR BOT  ${roleLabel}`, {
      fontSize: '30px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 80, 'Click a bot to select it', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Container holds all cards — scrolled horizontally
    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const SPACING = 330;
    const CARD_W = 300;
    const VISIBLE = 2; // bots visible at once (3rd partially)
    this._maxScroll = Math.max(0, allBots.length - VISIBLE);
    this._spacing = SPACING;

    // Initial container X: first card's left edge at x=25
    this._containerBaseX = 25 + CARD_W / 2; // = 175 → first card center at 175
    this.cardContainer = this.add.container(0, 0);

    allBots.forEach((botDef, i) => {
      this._createBotCardInContainer(this._containerBaseX + i * SPACING, 310, botDef);
    });

    // Scroll arrows
    this._leftArrow = this.add.text(18, 310, '◄', {
      fontSize: '32px', color: '#667788', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(20);
    this._rightArrow = this.add.text(882, 310, '►', {
      fontSize: '32px', color: '#667788', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(20);

    this._leftArrow.on('pointerover', () => { if (this._scrollIndex > 0) this._leftArrow.setColor('#aabbcc'); });
    this._leftArrow.on('pointerout', () => this._updateArrows());
    this._leftArrow.on('pointerdown', () => this._scroll(-1));

    this._rightArrow.on('pointerover', () => { if (this._scrollIndex < this._maxScroll) this._rightArrow.setColor('#aabbcc'); });
    this._rightArrow.on('pointerout', () => this._updateArrows());
    this._rightArrow.on('pointerdown', () => this._scroll(1));

    this._updateArrows();

    this.statusText = this.add.text(450, 520, '', {
      fontSize: '13px', color: '#aabbcc', fontFamily: 'monospace', align: 'center'
    }).setOrigin(0.5);

    this.fightBg = this.add.rectangle(450, 580, 240, 52, 0x333333);
    this.fightTxt = this.add.text(450, 580, 'FIGHT!', {
      fontSize: '24px', color: '#666666', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    // Network message handler
    NET.onMessage(msg => {
      if (this.isHost && msg.type === 'hello') {
        this.opponentKey = msg.botKey;
        this.statusText.setText('Opponent picked their bot!');
        if (this.selectedKey) this.enableFight();
      } else if (!this.isHost && msg.type === 'start') {
        this.scene.start('PreBattleLoadingScene', {
          playerBotKey: msg.playerBotKey,
          aiBotKey: msg.aiBotKey,
          isOnline: true,
          isHost: false
        });
      }
    });

    this.events.once('shutdown', () => {
      NET.onMessage(null);
    });

    this.makeBackButton(() => { NET.destroy(); this.scene.start('OnlineLobbyScene'); });
  }

  _createBotCardInContainer(x, y, botDef) {
    const cw = 300, ch = 330;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    const card = this.add.rectangle(x, y, cw, ch, 0x111122)
      .setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.4);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

    const previewKey = 'preview_' + botDef.key;
    if (!this.textures.exists(previewKey)) {
      if (botDef.loadoutConfig) {
        // Custom bot
        CustomBot._makeTexture(this, previewKey, botDef.loadoutConfig.color, botDef.loadoutConfig.chassis);
      } else {
        // Standard bot
        Bot.createTexture(this, { ...botDef, key: previewKey });
      }
    }
    const preview = this.add.image(x, y - 95, previewKey).setScale(2.5);

    const nameText = this.add.text(x, y - 22, botDef.name, {
      fontSize: '22px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    const weaponText = this.add.text(x, y + 10, botDef.weapon || 'Unknown', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const descText = this.add.text(x, y + 38, botDef.description || 'Custom build', {
      fontSize: '11px', color: '#667788', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5);

    const stats = botDef.stats || { speed: 50, armor: 50, weapon: 50 };
    const statItems = this._makeStatBars(x, y + 90, stats);

    this.cardContainer.add([card, border, preview, nameText, weaponText, descText, ...statItems]);

    card.on('pointerover', () => { if (this.selectedKey !== botDef.key) card.setFillStyle(0x1a1a33); });
    card.on('pointerout', () => { if (this.selectedKey !== botDef.key) card.setFillStyle(0x111122); });
    card.on('pointerdown', () => this.selectBot(botDef.key));

    this.cards.push({ card, border, botDef, cw, ch });
  }

  _makeStatBars(x, y, stats) {
    const entries = [
      { label: 'SPD', val: stats.speed, color: 0x44aaff },
      { label: 'ARM', val: stats.armor, color: 0x44ff88 },
      { label: 'WPN', val: stats.weapon, color: 0xff8844 }
    ];
    const bw = 160;
    const items = [];
    entries.forEach(({ label, val, color }, i) => {
      const by = y + i * 24;
      items.push(this.add.text(x - bw / 2 - 4, by, label, {
        fontSize: '10px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(1, 0.5));
      items.push(this.add.rectangle(x + 5, by, bw, 8, 0x222233).setOrigin(0, 0.5));
      items.push(this.add.rectangle(x + 5, by, Math.round(bw * val / 100), 8, color).setOrigin(0, 0.5));
    });
    return items;
  }

  _scroll(dir) {
    const next = this._scrollIndex + dir;
    if (next < 0 || next > this._maxScroll) return;
    this._scrollIndex = next;
    const targetX = -(this._scrollIndex * this._spacing);
    this.tweens.add({
      targets: this.cardContainer,
      x: targetX,
      duration: 220,
      ease: 'Power2'
    });
    this._updateArrows();
  }

  _updateArrows() {
    this._leftArrow.setColor(this._scrollIndex > 0 ? '#aabbcc' : '#445566');
    this._rightArrow.setColor(this._scrollIndex < this._maxScroll ? '#aabbcc' : '#445566');
  }

  selectBot(key) {
    this.selectedKey = key;

    this.cards.forEach(({ card, border, botDef, cw, ch }) => {
      if (botDef.key === key) {
        card.setFillStyle(0x192a44);
        border.clear(); border.lineStyle(3, botDef.color, 1.0);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      } else {
        card.setFillStyle(0x111122);
        border.clear(); border.lineStyle(2, botDef.color, 0.25);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      }
    });

    if (!this.isHost) {
      NET.send({ type: 'hello', botKey: key });
      this.statusText.setText('Waiting for host to start the match...');
    } else {
      this.statusText.setText(this.opponentKey
        ? 'Opponent ready — hit FIGHT! to start.'
        : 'Waiting for opponent to pick...');
      if (this.opponentKey) this.enableFight();
    }
  }

  enableFight() {
    this.fightBg.setFillStyle(0xcc2200).setInteractive({ useHandCursor: true });
    this.fightTxt.setColor('#ffffff');
    this.fightBg.removeAllListeners();
    this.fightBg.on('pointerover', () => this.fightBg.setFillStyle(0xff4400));
    this.fightBg.on('pointerout', () => this.fightBg.setFillStyle(0xcc2200));
    this.fightBg.on('pointerdown', () => this.startFight());
  }

  startFight() {
    if (!this.selectedKey || !this.opponentKey) return;
    NET.send({ type: 'start', playerBotKey: this.selectedKey, aiBotKey: this.opponentKey });
    this.scene.start('PreBattleLoadingScene', {
      playerBotKey: this.selectedKey,
      aiBotKey: this.opponentKey,
      isOnline: true,
      isHost: true
    });
  }

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
    btn.on('pointerdown', onClick);
  }

  drawBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x07070f, 1);
    bg.fillRect(0, 0, 900, 650);
    bg.lineStyle(1, 0x111133, 0.8);
    for (let x = 0; x < 900; x += 55) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, 650); bg.strokePath();
    }
    for (let y = 0; y < 650; y += 55) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(900, y); bg.strokePath();
    }
  }
}
