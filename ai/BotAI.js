class BotAI {
  constructor(bot, target, pit) {
    this.bot = bot;
    this.target = target;
    this.pit = pit; // { x, y, w, h }
    this.state = 'chase';
    this.evadeTimer = 0;
    this.lastHP = bot.hp;
    this.stuckTimer = 0;
    this.lastPos = { x: bot.x, y: bot.y };
  }

  update(delta) {
    if (!this.bot.active || !this.target.active) return;

    const hpLoss = this.lastHP - this.bot.hp;
    if (hpLoss > 8) {
      this.state = 'evade';
      this.evadeTimer = 1200;
    }
    this.lastHP = this.bot.hp;

    // Unstick detection
    this.stuckTimer += delta;
    if (this.stuckTimer > 1200) {
      const dist = Phaser.Math.Distance.Between(
        this.bot.x, this.bot.y, this.lastPos.x, this.lastPos.y
      );
      if (dist < 15 && this.state !== 'evade') {
        this.state = 'evade';
        this.evadeTimer = 600;
      }
      this.lastPos = { x: this.bot.x, y: this.bot.y };
      this.stuckTimer = 0;
    }

    if (this.state === 'evade') {
      this.evadeTimer -= delta;
      if (this.evadeTimer <= 0) this.state = 'chase';
      this.doEvade();
    } else {
      this.doChase();
    }
  }

  doChase() {
    const bot = this.bot;
    const target = this.target;

    // Pit avoidance: steer away from pit when nearby
    let targetX = target.x;
    let targetY = target.y;
    if (this.pit) {
      const botToPitDx = this.pit.x - bot.x;
      const botToPitDy = this.pit.y - bot.y;
      const botToPitDist = Math.sqrt(botToPitDx * botToPitDx + botToPitDy * botToPitDy);
      const avoidRadius = Math.max(this.pit.w, this.pit.h) * 0.85 + 50;
      if (botToPitDist < avoidRadius) {
        const repulse = ((avoidRadius - botToPitDist) / avoidRadius) * 350;
        targetX += (bot.x - this.pit.x) / botToPitDist * repulse;
        targetY += (bot.y - this.pit.y) / botToPitDist * repulse;
      }
    }

    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const targetAngle = Math.atan2(dy, dx);
    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - bot.rotation);

    if (angleDiff > 0.12) {
      bot.setAngularVelocity(bot.rotationSpeed);
    } else if (angleDiff < -0.12) {
      bot.setAngularVelocity(-bot.rotationSpeed);
    } else {
      bot.setAngularVelocity(0);
    }

    if (Math.abs(angleDiff) < 0.6) {
      bot.body.setVelocity(
        Math.cos(bot.rotation) * bot.botSpeed,
        Math.sin(bot.rotation) * bot.botSpeed
      );
    }
  }

  doEvade() {
    const bot = this.bot;
    bot.setAngularVelocity(bot.rotationSpeed * 0.6);
    bot.body.setVelocity(
      -Math.cos(bot.rotation) * bot.botSpeed * 0.65,
      -Math.sin(bot.rotation) * bot.botSpeed * 0.65
    );
  }
}
