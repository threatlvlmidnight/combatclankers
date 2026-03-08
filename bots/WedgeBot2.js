class WedgeBot2 extends Bot {
  constructor(scene, x, y) {
    super(scene, x, y, {
      key: 'wedgebot2',
      color: 0xaa1111,
      wedgeColor: 0xdd4444,
      hp: 300,
      driveHP: 50,
      weaponHP: 30,
      speed: 205,
      rotationSpeed: 140
    });
    this.setRotation(Math.PI);

    this.nameLabel = scene.add.text(x, y - 38, 'RAMPAGE', {
      fontSize: '11px', color: '#dd4444', fontFamily: 'monospace', fontStyle: 'bold'
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
