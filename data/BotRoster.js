// data/BotRoster.js
// Central bot definitions. botClass must be loaded before this file.
// Add new bots here — they automatically appear in Garage and BotSelect.
const BOT_ROSTER = [
  {
    key: 'crusher',
    name: 'CRUSHER',
    botClass: WedgeBot1,
    color: 0x1a5fb4,
    wedgeColor: 0x4a9fd4,
    weapon: 'Wedge',
    description: 'Classic wedge. Master of\npit control.',
    stats: { speed: 85, armor: 70, weapon: 20 }
  },
  {
    key: 'rampage',
    name: 'RAMPAGE',
    botClass: WedgeBot2,
    color: 0xaa1111,
    wedgeColor: 0xdd4444,
    weapon: 'Wedge',
    description: 'Aggressive wedge. Built\nto ram hard.',
    stats: { speed: 75, armor: 80, weapon: 20 }
  },
  {
    key: 'vortex',
    name: 'VORTEX',
    botClass: SpinnerBot,
    color: 0x1a8844,
    weapon: 'Drum Spinner',
    description: 'Drum spinner. Toggle\nspinner with J.',
    stats: { speed: 80, armor: 55, weapon: 85 }
  },
  {
    key: 'mjolnir',
    name: 'MJOLNIR',
    botClass: HammerBot,
    color: 0xcc8833,
    weapon: 'Hammer',
    description: 'Overhead hammer. Press\nJ to slam opponents.',
    stats: { speed: 55, armor: 85, weapon: 75 }
  }
];
