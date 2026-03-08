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
    chassis: '4wheel',
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
    chassis: '4wheel',
    weapon: 'Wedge',
    description: 'Aggressive wedge. Built\nto ram hard.',
    stats: { speed: 75, armor: 80, weapon: 20 }
  },
  {
    key: 'vortex',
    name: 'VORTEX',
    botClass: SpinnerBot,
    color: 0x1a8844,
    chassis: '2wheel',
    weapon: 'Drum Spinner',
    description: 'Drum spinner. Toggle\nspinner with Q.',
    stats: { speed: 80, armor: 55, weapon: 85 }
  },
  {
    key: 'mjolnir',
    name: 'MJOLNIR',
    botClass: HammerBot,
    color: 0xcc8833,
    chassis: '4wheel',
    weapon: 'Hammer',
    description: 'Overhead hammer. Press\nQ to slam opponents.',
    stats: { speed: 55, armor: 85, weapon: 75 }
  },
  {
    key: 'catapult',
    name: 'CATAPULT',
    botClass: FlipperBot,
    color: 0x1155cc,
    chassis: '4wheel',
    weapon: 'Flipper',
    description: 'Hydraulic flipper. Full\ncharge = massive launch.',
    stats: { speed: 65, armor: 65, weapon: 80 }
  },
  {
    key: 'ironjaw',
    name: 'IRONJAW',
    botClass: CrusherBot,
    color: 0x882200,
    chassis: '8wheel',
    weapon: 'Crusher',
    description: 'Grab and steer. Ram\nopponent into walls.',
    stats: { speed: 45, armor: 90, weapon: 70 }
  }
];
