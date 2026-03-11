// data/OpponentRoster.js
// Temporary storage for opponent's bots during online matches

let OPPONENT_ROSTER = [];

function addOpponentBot(botConfig) {
  try {
    if (!botConfig || !botConfig.key) {
      console.warn('[OpponentRoster] Invalid bot config');
      return false;
    }
    // Remove existing bot with same key
    OPPONENT_ROSTER = OPPONENT_ROSTER.filter(b => b.key !== botConfig.key);
    OPPONENT_ROSTER.push(botConfig);
    console.log('[OpponentRoster] Added opponent bot:', botConfig.key, botConfig);
    return true;
  } catch (e) {
    console.error('[OpponentRoster] Error adding bot:', e);
    return false;
  }
}

function getOpponentBot(key) {
  return OPPONENT_ROSTER.find(b => b.key === key);
}

function clearOpponentRoster() {
  OPPONENT_ROSTER = [];
}

function serializeBotConfig(botDef) {
  try {
    console.log('[OpponentRoster] Serializing bot:', { key: botDef.key, name: botDef.name, loadoutConfig: botDef.loadoutConfig });
    
    // For custom bots, use the loadoutConfig
    if (botDef.loadoutConfig) {
      const cfg = botDef.loadoutConfig;
      return {
        key: botDef.key,
        name: botDef.name,
        botClass: 'CustomBot',
        color: cfg.color,
        chassis: cfg.chassis,
        armor: cfg.armor,
        weapon: cfg.weapon,
        description: botDef.description || '',
        // Include the full loadoutConfig for reconstruction
        loadoutConfig: cfg,
        isCustom: true
      };
    }
    
    // For roster bots, include all properties with correct botClass name
    return {
      key: botDef.key,
      name: botDef.name,
      botClass: botDef.botClass?.name || 'Bot',
      color: botDef.color,
      wedgeColor: botDef.wedgeColor,
      chassis: botDef.chassis,
      weapon: botDef.weapon,
      description: botDef.description,
      stats: botDef.stats,
      hp: botDef.hp,
      driveHP: botDef.driveHP,
      weaponHP: botDef.weaponHP,
      speed: botDef.speed,
      rotationSpeed: botDef.rotationSpeed,
      isCustom: false
    };
  } catch (e) {
    console.error('[OpponentRoster] Error serializing bot:', e);
    return null;
  }
}

function deserializeBotConfig(data) {
  try {
    // Determine the correct bot class
    let botClass = CustomBot;
    if (!data.isCustom && data.botClass) {
      // For roster bots, map botClass name to actual class
      const classMap = {
        'FlipperBot': FlipperBot,
        'SpinnerBot': SpinnerBot,
        'HammerBot': HammerBot,
        'CrusherBot': CrusherBot,
        'WedgeBot1': WedgeBot1,
        'WedgeBot2': WedgeBot2,
        'CustomBot': CustomBot,
        'Bot': Bot
      };
      botClass = classMap[data.botClass] || CustomBot;
      console.log('[OpponentRoster] Mapped bot class:', { sent: data.botClass, resolved: botClass.name });
    }

    // Reconstruct loadoutConfig for CustomBot
    const loadoutConfig = {
      color: data.color,
      chassis: data.chassis,
      armor: data.armor,
      weapon: data.weapon,
      name: data.name,
      key: data.key
    };

    const config = {
      key: data.key,
      name: data.name,
      botClass: botClass,
      color: data.color,
      wedgeColor: data.wedgeColor || data.color,
      chassis: data.chassis,
      weapon: data.weapon,
      description: data.description || '',
      stats: data.stats || { speed: 75, armor: 75, weapon: 75 },
      hp: data.hp || 100,
      driveHP: data.driveHP || 50,
      weaponHP: data.weaponHP || 50,
      speed: data.speed || 200,
      rotationSpeed: data.rotationSpeed || 150,
      armor: data.armor || 0,
      weaponMod: data.weaponMod || 0,
      speedMod: data.speedMod || 0,
      // Include loadoutConfig for CustomBot constructor
      loadoutConfig: data.loadoutConfig || loadoutConfig,
      isOpponentBot: true
    };
    console.log('[OpponentRoster] Deserialized bot config:', { key: config.key, name: config.name, botClass: config.botClass.name, hasLoadoutConfig: !!config.loadoutConfig });
    return config;
  } catch (e) {
    console.error('[OpponentRoster] Error deserializing bot:', e);
    return null;
  }
}
