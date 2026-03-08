// scenes/GarageScene.js
class GarageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GarageScene' });
  }

  create() {
    this.drawBackground();

    // Mode selection tabs
    const tabY = 28;
    const viewBtn = this.add.text(150, tabY, 'VIEW BOTS', {
      fontSize: '16px', color: '#aabbcc', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._viewTab = viewBtn;

    const buildBtn = this.add.text(450, tabY, 'BUILD BOT', {
      fontSize: '16px', color: '#556677', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._buildTab = buildBtn;

    this._activeMode = 'view';

    viewBtn.on('pointerdown', () => {
      if (this._activeMode !== 'view') {
        this._activeMode = 'view';
        this._updateTabs();
        this._renderViewMode();
      }
    });

    buildBtn.on('pointerdown', () => {
      if (this._activeMode !== 'build') {
        this._activeMode = 'build';
        this._updateTabs();
        this._renderBuildMode();
      }
    });

    this._uiContainer = this.add.container(0, 0);
    this._updateTabs();
    this._renderViewMode();

    // Navigation
    this._backBtn = this.add.text(40, 600, '◄ BACK', {
      fontSize: '14px', color: '#556677', fontFamily: 'monospace'
    }).setInteractive({ useHandCursor: true });
    this._backBtn.on('pointerover', () => this._backBtn.setColor('#aabbcc'));
    this._backBtn.on('pointerout', () => this._backBtn.setColor('#556677'));
    this._backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  _updateTabs() {
    const viewColor = this._activeMode === 'view' ? '#aabbcc' : '#556677';
    const buildColor = this._activeMode === 'build' ? '#ffaa00' : '#556677';
    this._viewTab.setColor(viewColor);
    this._buildTab.setColor(buildColor);
  }

  _renderViewMode() {
    // Clear UI container
    this._uiContainer.removeAll(true);

    this._uiContainer.add(this.add.text(450, 80, 'BOT ROSTER', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    const allBots = [...BOT_ROSTER, ...CUSTOM_ROSTER];
    const rowsPerPage = 2;
    const cardsPerRow = 3;
    const spacing = 280;
    const startY = 200;
    const startX = 450 - ((cardsPerRow - 1) * spacing) / 2;

    allBots.slice(0, rowsPerPage * cardsPerRow).forEach((botDef, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const x = startX + col * spacing;
      const y = startY + row * 220;
      this._renderBotCard(x, y, botDef);
    });
  }

  _renderBotCard(x, y, botDef) {
    const cw = 260, ch = 200;
    const colorHex = '#' + botDef.color.toString(16).padStart(6, '0');

    const card = this.add.rectangle(x, y, cw, ch, 0x111122);
    this._uiContainer.add(card);

    const border = this.add.graphics();
    border.lineStyle(2, botDef.color, 0.6);
    border.strokeRect(x - cw / 2, y - ch / 2, cw, ch);
    this._uiContainer.add(border);

    const previewKey = 'preview_' + botDef.key;
    if (!this.textures.exists(previewKey)) {
      if (botDef.loadoutConfig) {
        CustomBot._makeTexture(this, previewKey, botDef.color);
      } else {
        Bot.createTexture(this, { ...botDef, key: previewKey });
      }
    }
    const img = this.add.image(x, y - 50, previewKey).setScale(2);
    this._uiContainer.add(img);

    const nameText = this.add.text(x, y + 20, botDef.name, {
      fontSize: '16px', color: colorHex, fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this._uiContainer.add(nameText);

    const wpnText = this.add.text(x, y + 45, botDef.weapon, {
      fontSize: '10px', color: '#667788', fontFamily: 'monospace'
    }).setOrigin(0.5);
    this._uiContainer.add(wpnText);

    // Delete button for custom bots only
    if (botDef.loadoutConfig) {
      const delBtn = this.add.text(x + 120, y - 85, '✕ DELETE', {
        fontSize: '9px', color: '#dd4444', fontFamily: 'monospace'
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      delBtn.on('pointerdown', () => this._deleteCustomBot(botDef.key));
      this._uiContainer.add(delBtn);
    }
  }

  _deleteCustomBot(key) {
    const idx = CUSTOM_ROSTER.findIndex(b => b.key === key);
    if (idx >= 0) {
      CUSTOM_ROSTER.splice(idx, 1);
      // Re-save to localStorage without this bot
      try {
        const list = CUSTOM_ROSTER.map(b => b.loadoutConfig);
        localStorage.setItem('combatclankers_custom_bots', JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to save custom roster:', e);
      }
      this._renderViewMode();
    }
  }

  _renderBuildMode() {
    // Clear UI container
    this._uiContainer.removeAll(true);

    if (!this._builderState) {
      this._builderState = {
        name: '',
        color: 0x1155cc,
        chassis: '4wheel',
        armor: 'medium',
        weapon: 'flipper'
      };
    }

    this._uiContainer.add(this.add.text(450, 70, 'BUILD YOUR BOT', {
      fontSize: '24px', color: '#ffaa00', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Left side: builder options
    this._renderBuilderOptions();

    // Right side: live preview
    this._renderBuilderPreview();
  }

  _renderBuilderOptions() {
    const leftX = 150;
    let y = 140;

    // Name input section
    this._uiContainer.add(this.add.text(leftX, y, 'BOT NAME', {
      fontSize: '12px', color: '#44aa44', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0));

    y += 25;
    const nameInput = this.add.rectangle(leftX + 100, y, 200, 32, 0x111133);
    this._uiContainer.add(nameInput);

    const nameBorder = this.add.graphics();
    nameBorder.lineStyle(2, 0x44aa44, 0.6);
    nameBorder.strokeRect(leftX + 1, y - 16, 200, 32);
    this._uiContainer.add(nameBorder);

    let displayName = this._builderState.name || '[NAME]';
    const nameDisplay = this.add.text(leftX + 105, y, displayName, {
      fontSize: '14px', color: '#44ff88', fontFamily: 'monospace'
    }).setOrigin(0, 0.5);
    this._uiContainer.add(nameDisplay);

    nameInput.setInteractive({ useHandCursor: true });
    nameInput.on('pointerdown', () => {
      const name = prompt('Enter bot name (max 16 chars):', this._builderState.name || '');
      if (name !== null) {
        this._builderState.name = name.toUpperCase().slice(0, 16);
        this._renderBuildMode();
      }
    });

    y += 50;

    // Chassis section
    this._uiContainer.add(this.add.text(leftX, y, 'CHASSIS', {
      fontSize: '12px', color: '#4488ff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0));

    y += 25;
    ['2wheel', '4wheel', '8wheel'].forEach((key) => {
      const def = CHASSIS_DEFS[key];
      const selected = this._builderState.chassis === key;
      const btn = this.add.rectangle(leftX + 100, y, 180, 28, selected ? 0x224466 : 0x111133).setInteractive({ useHandCursor: true });
      this._uiContainer.add(btn);

      const txt = this.add.text(leftX + 110, y, `${def.label}  (${def.speed}px)`, {
        fontSize: '11px', color: selected ? '#66ee66' : '#556677', fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
      this._uiContainer.add(txt);

      btn.on('pointerdown', () => {
        this._builderState.chassis = key;
        this._renderBuildMode();
      });

      y += 32;
    });

    y += 10;

    // Armor section
    this._uiContainer.add(this.add.text(leftX, y, 'ARMOR', {
      fontSize: '12px', color: '#44ff88', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0));

    y += 25;
    ['light', 'medium', 'heavy'].forEach((key) => {
      const def = ARMOR_DEFS[key];
      const selected = this._builderState.armor === key;
      const btn = this.add.rectangle(leftX + 100, y, 180, 28, selected ? 0x224466 : 0x111133).setInteractive({ useHandCursor: true });
      this._uiContainer.add(btn);

      const txt = this.add.text(leftX + 110, y, `${def.label}  (DR ${Math.round(def.dr * 100)}%)`, {
        fontSize: '11px', color: selected ? '#ffaa44' : '#556677', fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
      this._uiContainer.add(txt);

      btn.on('pointerdown', () => {
        this._builderState.armor = key;
        this._renderBuildMode();
      });

      y += 32;
    });

    y += 10;

    // Weapon section
    this._uiContainer.add(this.add.text(leftX, y, 'WEAPON', {
      fontSize: '12px', color: '#ff8844', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0));

    y += 25;
    ['wedge', 'hammer', 'spinner', 'flipper', 'crusher'].forEach((key) => {
      const def = WEAPON_DEFS[key];
      const selected = this._builderState.weapon === key;
      const btn = this.add.rectangle(leftX + 100, y, 180, 28, selected ? 0x224466 : 0x111133).setInteractive({ useHandCursor: true });
      this._uiContainer.add(btn);

      const txt = this.add.text(leftX + 110, y, def.label, {
        fontSize: '11px', color: selected ? '#ffaa44' : '#556677', fontFamily: 'monospace'
      }).setOrigin(0, 0.5);
      this._uiContainer.add(txt);

      btn.on('pointerdown', () => {
        this._builderState.weapon = key;
        this._renderBuildMode();
      });

      y += 32;
    });
  }

  _renderBuilderPreview() {
    const rightX = 650;
    let y = 140;

    const bits = this._builderState;
    const stats = CustomBot.computeDisplayStats(bits);

    this._uiContainer.add(this.add.text(rightX, y, 'PREVIEW', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0));

    // Color swatches
    y += 25;
    const colors = [0xcc2200, 0xff6600, 0xffcc00, 0x88cc00, 0x00aa44, 0x0088cc, 0x1155cc, 0x6622cc];
    colors.forEach((color, i) => {
      const cx = rightX - 140 + (i % 4) * 35;
      const cy = y + Math.floor(i / 4) * 35;
      const swwatch = this.add.circle(cx, cy, 12, color).setInteractive({ useHandCursor: true });
      this._uiContainer.add(swwatch);
      swwatch.on('pointerdown', () => {
        this._builderState.color = color;
        this._renderBuildMode();
      });
      if (color === bits.color) {
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffffff, 1);
        ring.strokeCircle(cx, cy, 16);
        this._uiContainer.add(ring);
      }
    });

    y += 80;

    // Stats
    ['SPEED', 'ARMOR', 'WEAPON'].forEach((label, i) => {
      const statKey = label.toLowerCase();
      const val = stats[i === 0 ? 'speed' : (i === 1 ? 'armor' : 'weapon')];
      const colors = [0x44aaff, 0x44ff88, 0xff8844];

      this._uiContainer.add(this.add.text(rightX - 60, y, label, {
        fontSize: '10px', color: '#445566', fontFamily: 'monospace'
      }).setOrigin(0, 0.5));
      this._uiContainer.add(this.add.rectangle(rightX - 10, y, 120, 8, 0x222233).setOrigin(0, 0.5));
      this._uiContainer.add(this.add.rectangle(rightX - 10, y, Math.round(120 * val / 100), 8, colors[i]).setOrigin(0, 0.5));
      this._uiContainer.add(this.add.text(rightX + 115, y, String(val), {
        fontSize: '10px', color: '#667788', fontFamily: 'monospace'
      }).setOrigin(0, 0.5));

      y += 28;
    });

    y += 20;

    // BUILD BOT button
    const buildBtn = this.add.rectangle(rightX, y, 140, 44, 0x883300).setInteractive({ useHandCursor: true });
    this._uiContainer.add(buildBtn);
    const buildTxt = this.add.text(rightX, y, 'BUILD IT!', {
      fontSize: '16px', color: '#ffcc44', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);
    this._uiContainer.add(buildTxt);

    buildBtn.on('pointerover', () => buildBtn.setFillStyle(0xcc4400));
    buildBtn.on('pointerout', () => buildBtn.setFillStyle(0x883300));
    buildBtn.on('pointerdown', () => this._finalizeBot());
  }

  _finalizeBot() {
    if (!this._builderState.name) {
      alert('Please enter a bot name!');
      return;
    }

    const key = 'custom_' + Date.now();
    const cfg = { key, ...this._builderState };
    saveCustomBot(cfg);

    // Reload custom roster
    CUSTOM_ROSTER.length = 0;
    loadCustomRoster();

    alert(`Bot "${cfg.name}" created!`);
    this._renderViewMode();
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
