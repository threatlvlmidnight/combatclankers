class WedgeBot1 extends Bot {
  constructor(scene, x, y) {
    super(scene, x, y, {
      key: 'wedgebot1',
      color: 0x1a5fb4,
      wedgeColor: 0x4a9fd4,
      hp: 100,
      driveHP: 50,
      weaponHP: 30,
      speed: 230,
      rotationSpeed: 165
    });
    this.setRotation(0);

    this.nameLabel = scene.add.text(x, y - 38, 'CRUSHER', {
      fontSize: '11px', color: '#4a9fd4', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.nameLabel) this.nameLabel.setPosition(this.x, this.y - 38);
  }

  destroy(fromScene) {
    if (this.nameLabel) this.nameLabel.destroy();
    super.destroy(fromScene);
  }
}
