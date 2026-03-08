// data/CustomRoster.js
// Custom bots built in the Garage. Populated from localStorage at startup.
// Add new entries here programmatically — never hardcode.
const CUSTOM_ROSTER = [];

function loadCustomRoster() {
  try {
    const saved = localStorage.getItem('combatclankers_custom_bots');
    if (!saved) return;
    const list = JSON.parse(saved);
    list.forEach(cfg => {
      if (!CUSTOM_ROSTER.find(b => b.key === cfg.key)) {
        CUSTOM_ROSTER.push({
          key: cfg.key,
          name: cfg.name,
          botClass: CustomBot,    // filled after CustomBot is defined
          color: cfg.color,
          weapon: cfg.weapon,
          description: `${cfg.chassis} chassis\n${cfg.armor} armor`,
          stats: CustomBot.computeDisplayStats(cfg),
          loadoutConfig: cfg      // pass full config to constructor
        });
      }
    });
  } catch (e) {
    console.warn('Failed to load custom roster:', e);
  }
}

function saveCustomBot(cfg) {
  try {
    const saved = localStorage.getItem('combatclankers_custom_bots');
    const list = saved ? JSON.parse(saved) : [];
    // Remove old entry with same key if re-saving
    const filtered = list.filter(b => b.key !== cfg.key);
    filtered.push(cfg);
    localStorage.setItem('combatclankers_custom_bots', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to save custom bot:', e);
  }
}
