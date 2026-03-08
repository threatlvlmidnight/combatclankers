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
    let goalX = target.x;
    let goalY = target.y;

    if (this.pit) {
      const { x: px, y: py, w: pw, h: ph } = this.pit;
      const safeR = Math.max(pw, ph) / 2 + 50; // 70 + 50 = 120

      const bdx = bot.x - px;
      const bdy = bot.y - py;
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy);

      if (bDist < safeR) {
        // Emergency: bot inside danger zone — flee directly away from pit, skip steering
        const fleeAngle = Math.atan2(bdy, bdx);
        bot.setAngularVelocity(0);
        bot.body.setVelocity(
          Math.cos(fleeAngle) * bot.botSpeed * 1.3,
          Math.sin(fleeAngle) * bot.botSpeed * 1.3
        );
        return;
      }

      // Check if direct path to target crosses pit danger zone
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const dLen = Math.sqrt(dx * dx + dy * dy);
      if (dLen > 1) {
        const t = Math.max(0, Math.min(1, ((px - bot.x) * dx + (py - bot.y) * dy) / (dLen * dLen)));
        const cpx = bot.x + t * dx;
        const cpy = bot.y + t * dy;
        const pathDist = Math.sqrt((cpx - px) ** 2 + (cpy - py) ** 2);

        if (pathDist < safeR) {
          // Path crosses pit — find which side to route around using cross product
          const cross = dx * (py - bot.y) - dy * (px - bot.x); // sign = which side pit is on
          if (Math.abs(cross) < 50) {
            // Degenerate: bot, pit, target nearly collinear
            // Move perpendicular to the bot→target line at bot's current X first
            const sideSign = bot.y <= py ? -1 : 1;
            goalX = bot.x;
            goalY = py + sideSign * (safeR + 30);
          } else {
            // Normal case: route to a point beside the pit on the far side
            const sideSign = cross > 0 ? 1 : -1;
            const perpX = -(py - bot.y) / dLen * sideSign;
            const perpY = (px - bot.x) / dLen * sideSign;
            goalX = px + perpX * (safeR + 20);
            goalY = py + perpY * (safeR + 20);
          }
        }
      }
    }

    const dx = goalX - bot.x;
    const dy = goalY - bot.y;
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
