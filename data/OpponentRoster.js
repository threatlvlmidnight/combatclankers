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
    return {
      key: botDef.key,
      name: botDef.name,
      botClass: 'CustomBot', // Type identifier
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
      // Custom bot specific
      armor: botDef.armor,
      weaponMod: botDef.weaponMod,
      speedMod: botDef.speedMod
    };
  } catch (e) {
    console.error('[OpponentRoster] Error serializing bot:', e);
    return null;
  }
}

function deserializeBotConfig(data) {
  try {
    const config = {
      key: data.key,
      name: data.name,
      botClass: CustomBot, // Use CustomBot for all opponent shared bots
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
      isOpponentBot: true
    };
    return config;
  } catch (e) {
    console.error('[OpponentRoster] Error deserializing bot:', e);
    return null;
  }
}
