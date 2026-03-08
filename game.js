const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 650,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } }
  },
  scene: [MainMenuScene, ModeSelectScene, BotSelectScene, GarageScene, OnlineLobbyScene, OnlineBotSelectScene, BattleScene, UIScene]
};

loadCustomRoster();
window.game = new Phaser.Game(config);
