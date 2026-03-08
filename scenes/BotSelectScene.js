// scenes/BotSelectScene.js
class BotSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BotSelectScene' });
  }

  create() {
    this.selectedKey = null;
    this.cards = [];
    this._scrollIndex = 0;

    this.drawBackground();

    this.add.text(450, 55, 'CHOOSE YOUR BOT', {
      fontSize: '36px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(450, 98, 'Click a bot to select it, then hit FIGHT!', {
      fontSize: '13px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Container holds all cards — scrolled horizontally
    const SPACING = 330;
    const CARD_W = 300;
    const VISIBLE = 2; // bots visible at once (3rd partially)
    this._maxScroll = Math.max(0, BOT_ROSTER.length - VISIBLE);
    this._spacing = SPACING;

    // Initial container X: first card's left edge at x=25
    this._containerBaseX = 25 + CARD_W / 2; // = 175 → first card center at 175
    this.cardContainer = this.add.container(0, 0);

    BOT_ROSTER.forEach((botDef, i) => {
      this._createBotCard(this._containerBaseX + i * SPACING, 320, botDef);
    });

    // Scroll arrows
    this._leftArrow = this.add.text(18, 320, '◄', {
      fontSize: '28px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    this._rightArrow = this.add.text(882, 320, '►', {
      fontSize: '28px', color: '#334455', fontFamily: 'monospace'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(10);

    this._leftArrow.on('pointerover', () => { if (this._scrollIndex > 0) this._leftArrow.setColor('#aabbcc'); });
    this._leftArrow.on('pointerout', () => this._updateArrows());
    this._leftArrow.on('pointerdown', () => this._scroll(-1));

    this._rightArrow.on('pointerover', () => { if (this._scrollIndex < this._maxScroll) this._rightArrow.setColor('#aabbcc'); });
    this._rightArrow.on('pointerout', () => this._updateArrows());
    this._rightArrow.on('pointerdown', () => this._scroll(1));

    this._updateArrows();

    // Dot indicators
    this._dots = [];
    const dotY = 530;
    const dotSpacing = 18;
    const dotsStartX = 450 - ((BOT_ROSTER.length - 1) * dotSpacing) / 2;
    for (let i = 0; i < BOT_ROSTER.length; i++) {
      const dot = this.add.circle(dotsStartX + i * dotSpacing, dotY, 5, 0x223344).setDepth(10);
      this._dots.push(dot);
    }
    this._updateDots();

    // Fight button (disabled until selection)
    this.fightBg = this.add.rectangle(450, 590, 240, 52, 0x333333);
    this.fightTxt = this.add.text(450, 590, 'FIGHT!', {
      fontSize: '24px', color: '#666666', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.makeBackButton(() => this.scene.start('ModeSelectScene'));
  }

  _createBotCard(x, y, botDef) {
    const cw = 300, ch = 370;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    const card = this.add.rectangle(x, y, cw, ch, 0x111122).setInteractive({ useHandCursor: true });
    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.4);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);

    const previewKey = 'preview_' + botDef.key;
    if (!this.textures.exists(previewKey)) {
      Bot.createTexture(this, { ...botDef, key: previewKey });
    }
    const preview = this.add.image(x, y - 115, previewKey).setScale(2.5);

    const nameText = this.add.text(x, y - 40, botDef.name, {
      fontSize: '22px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    const weaponText = this.add.text(x, y - 10, botDef.weapon, {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace'
    }).setOrigin(0.5);
    const descText = this.add.text(x, y + 18, botDef.description, {
      fontSize: '11px', color: '#667788', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: 260 }
    }).setOrigin(0.5);

    const statItems = this._makeStatBars(x, y + 80, botDef.stats);

    this.cardContainer.add([card, border, preview, nameText, weaponText, descText, ...statItems]);

    card.on('pointerover', () => {
      if (this.selectedKey !== botDef.key) card.setFillStyle(0x1a1a33);
    });
    card.on('pointerout', () => {
      if (this.selectedKey !== botDef.key) card.setFillStyle(0x111122);
    });
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
    this._updateDots();
  }

  _updateArrows() {
    this._leftArrow.setColor(this._scrollIndex > 0 ? '#778899' : '#222233');
    this._rightArrow.setColor(this._scrollIndex < this._maxScroll ? '#778899' : '#222233');
  }

  _updateDots() {
    this._dots.forEach((dot, i) => {
      dot.setFillStyle(i === this._scrollIndex ? 0x6688aa : 0x223344);
    });
  }

  selectBot(key) {
    this.selectedKey = key;

    this.cards.forEach(({ card, border, botDef, cw, ch }) => {
      if (botDef.key === key) {
        card.setFillStyle(0x192a44);
        border.clear();
        border.lineStyle(3, botDef.color, 1.0);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      } else {
        card.setFillStyle(0x111122);
        border.clear();
        border.lineStyle(2, botDef.color, 0.25);
        border.strokeRect(card.x - cw / 2, card.y - ch / 2, cw, ch);
      }
    });

    this.fightBg.setFillStyle(0xcc2200).setInteractive({ useHandCursor: true });
    this.fightTxt.setColor('#ffffff');
    this.fightBg.removeAllListeners();
    this.fightBg.on('pointerover', () => this.fightBg.setFillStyle(0xff4400));
    this.fightBg.on('pointerout', () => this.fightBg.setFillStyle(0xcc2200));
    this.fightBg.on('pointerdown', () => this.startFight());
  }

  startFight() {
    if (!this.selectedKey) return;
    const others = BOT_ROSTER.filter(b => b.key !== this.selectedKey);
    const aiBotDef = others.length > 0
      ? others[Math.floor(Math.random() * others.length)]
      : BOT_ROSTER[0];
    this.scene.start('BattleScene', {
      playerBotKey: this.selectedKey,
      aiBotKey: aiBotDef.key
    });
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

  makeBackButton(onClick) {
    const btn = this.add.text(40, 28, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#aabbcc'));
    btn.on('pointerout', () => btn.setColor('#556677'));
    btn.on('pointerdown', onClick);
  }
}
