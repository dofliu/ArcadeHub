import { Character, Command, Move } from './types';

// ---------------------------------------------------------------------------
// Move construction helpers. Every fighter shares a common moveset *shape*
// (the same buttons map to the same archetypes) but the numbers, colours and
// projectiles differ per character — exactly how an arcade fighter roster is
// balanced. Hitboxes are in local space: +x is forward, +y is up from feet.
// ---------------------------------------------------------------------------

type MoveOverrides = Partial<Move> & Pick<Move, 'name' | 'startupPose' | 'activePose'>;

const move = (type: Move['type'], o: MoveOverrides): Move => ({
  type,
  startup: 4, active: 3, recovery: 8,
  damage: 40, chip: 0,
  hitstun: 14, blockstun: 10,
  hitHeight: 'mid',
  hitbox: { x: 24, y: 70, w: 30, h: 20 },
  knockback: { x: 4, y: 0 },
  meterGain: 60, meterCost: 0,
  cancelable: false, launches: false,
  ...o,
});

// Build a complete move table for a character given a few tuning knobs.
function buildMoves(opts: {
  fireballColor: string; fireballGlow: string;
  auraColor: string;
  speedy?: boolean;   // lighter, faster character (Mantis)
  heavy?: boolean;    // slower, harder hitting (Volt)
}): Record<string, Move> {
  const dmgScale = opts.heavy ? 1.2 : opts.speedy ? 0.82 : 1;
  const d = (n: number) => Math.round(n * dmgScale);

  return {
    lp: move('normal', {
      name: 'Jab', startup: 3, active: 3, recovery: 7,
      damage: d(38), chip: 0, hitstun: 12, blockstun: 9,
      hitbox: { x: 22, y: 84, w: 32, h: 18 }, knockback: { x: 3, y: 0 },
      cancelable: true, meterGain: 50, sfx: 'hit',
      startupPose: 'jab', activePose: 'jab',
    }),
    hp: move('normal', {
      name: 'Strong', startup: 7, active: 4, recovery: 16,
      damage: d(92), chip: 8, hitstun: 19, blockstun: 13,
      hitbox: { x: 24, y: 80, w: 42, h: 24 }, knockback: { x: 7, y: 0 },
      cancelable: true, meterGain: 90, sfx: 'hit',
      startupPose: 'strongPunch', activePose: 'strongPunch',
    }),
    lk: move('normal', {
      name: 'Short', startup: 5, active: 3, recovery: 10,
      damage: d(46), chip: 2, hitstun: 13, blockstun: 10,
      hitbox: { x: 24, y: 46, w: 38, h: 22 }, knockback: { x: 4, y: 0 },
      cancelable: true, meterGain: 55, sfx: 'hit',
      startupPose: 'jumpKick', activePose: 'jumpKick',
    }),
    hk: move('normal', {
      name: 'Roundhouse', startup: 10, active: 4, recovery: 20,
      damage: d(118), chip: 10, hitstun: 22, blockstun: 14, launches: true,
      hitbox: { x: 24, y: 60, w: 48, h: 34 }, knockback: { x: 10, y: 5 },
      meterGain: 100, sfx: 'hit',
      startupPose: 'highKick', activePose: 'highKick',
    }),
    clp: move('normal', {
      name: 'Crouch Jab', startup: 3, active: 3, recovery: 8,
      damage: d(34), chip: 0, hitstun: 12, blockstun: 9, groundOnly: true,
      hitbox: { x: 20, y: 50, w: 34, h: 18 }, knockback: { x: 3, y: 0 },
      cancelable: true, meterGain: 45, sfx: 'hit',
      startupPose: 'crouchPunch', activePose: 'crouchPunch',
    }),
    clk: move('normal', {
      name: 'Low Short', startup: 5, active: 3, recovery: 9, hitHeight: 'low',
      damage: d(40), chip: 2, hitstun: 13, blockstun: 10, groundOnly: true,
      hitbox: { x: 24, y: 8, w: 40, h: 16 }, knockback: { x: 4, y: 0 },
      cancelable: true, meterGain: 50, sfx: 'hit',
      startupPose: 'crouchKick', activePose: 'crouchKick',
    }),
    chk: move('normal', {
      name: 'Sweep', startup: 9, active: 4, recovery: 22, hitHeight: 'low',
      damage: d(80), chip: 6, hitstun: 20, blockstun: 13, launches: true, groundOnly: true,
      hitbox: { x: 24, y: 4, w: 50, h: 16 }, knockback: { x: 9, y: 3 },
      meterGain: 90, sfx: 'hit',
      startupPose: 'lowKick', activePose: 'lowKick',
    }),
    jp: move('normal', {
      name: 'Jump Punch', startup: 4, active: 6, recovery: 4, hitHeight: 'overhead',
      damage: d(64), chip: 4, hitstun: 16, blockstun: 11, airOnly: true,
      hitbox: { x: 16, y: 64, w: 34, h: 28 }, knockback: { x: 5, y: 0 },
      meterGain: 70, sfx: 'hit',
      startupPose: 'jab', activePose: 'jab',
    }),
    jk: move('normal', {
      name: 'Jump Kick', startup: 5, active: 8, recovery: 4, hitHeight: 'overhead',
      damage: d(76), chip: 6, hitstun: 17, blockstun: 12, airOnly: true,
      hitbox: { x: 20, y: 24, w: 40, h: 30 }, knockback: { x: 6, y: 0 },
      meterGain: 80, sfx: 'hit',
      startupPose: 'jumpKick', activePose: 'jumpKick',
    }),

    // --- Specials ---
    fireball: move('special', {
      name: 'Energy Wave', startup: 12, active: 4, recovery: 24,
      damage: 0, hitstun: 0, blockstun: 0, groundOnly: true,
      hitbox: { x: 0, y: 0, w: 0, h: 0 }, knockback: { x: 0, y: 0 },
      meterGain: 70, sfx: 'special',
      startupPose: 'fireballWindup', activePose: 'fireball',
      projectile: {
        speed: opts.speedy ? 6.5 : 5, w: 34, h: 26, yOffset: 72,
        damage: d(88), hitstun: 18, blockstun: 12, life: 150,
        color: opts.fireballColor, glow: opts.fireballGlow,
      },
    }),
    uppercut: move('special', {
      name: 'Rising Dragon', startup: 4, active: 10, recovery: 28,
      damage: d(150), chip: 12, hitstun: 24, blockstun: 14, launches: true,
      invulnStartup: true, groundOnly: true,
      hitbox: { x: 6, y: 56, w: 30, h: 86 }, knockback: { x: 5, y: 16 },
      meterGain: 110, sfx: 'special',
      startupPose: 'uppercut', activePose: 'uppercut',
    }),
    spinkick: move('special', {
      name: 'Cyclone Kick', startup: 8, active: 14, recovery: 18,
      damage: d(100), chip: 8, hitstun: 18, blockstun: 12,
      hitbox: { x: 18, y: 38, w: 46, h: 44 }, knockback: { x: 8, y: 2 },
      forwardMomentum: opts.speedy ? 5 : 3.6, meterGain: 95, sfx: 'special',
      startupPose: 'spinKick', activePose: 'spinKick',
    }),
    super: move('super', {
      name: 'Super Nova', startup: 8, active: 6, recovery: 30,
      damage: 0, hitstun: 0, blockstun: 0, meterCost: 100, groundOnly: true,
      hitbox: { x: 0, y: 0, w: 0, h: 0 }, knockback: { x: 0, y: 0 },
      meterGain: 0, sfx: 'super',
      startupPose: 'super', activePose: 'super',
      projectile: {
        speed: 6.5, w: 64, h: 70, yOffset: 60,
        damage: d(320), hitstun: 40, blockstun: 20, life: 150,
        color: opts.auraColor, glow: opts.fireballGlow, super: true,
      },
    }),
  };
}

// Special-move command recipes (facing-relative numpad). Higher priority wins
// when several recipes are satisfied on the same button press.
const SHOTO_COMMANDS: Command[] = [
  { motion: [2, 3, 6, 2, 3, 6], buttons: ['lp', 'hp'], move: 'super', priority: 100 },
  { motion: [6, 2, 3], buttons: ['lp', 'hp'], move: 'uppercut', priority: 80 },
  { motion: [2, 3, 6], buttons: ['lp', 'hp'], move: 'fireball', priority: 60 },
  { motion: [2, 1, 4], buttons: ['lk', 'hk'], move: 'spinkick', priority: 60 },
];

export const CHARACTERS: Character[] = [
  {
    id: 'blaze',
    name: 'BLAZE',
    title: '烈焰武者 / Ansatsuken',
    palette: {
      skin: '#e9b48a', skinShade: '#c98e63',
      gi: '#e8e8ef', giShade: '#b9b9c8',
      hair: '#3a2a1a', accent: '#d33a2c', aura: '#ff7a2c',
    },
    walkSpeed: 3.2, jumpStrength: 15.5, maxHealth: 1000,
    moves: buildMoves({ fireballColor: '#48b6ff', fireballGlow: '#bfe6ff', auraColor: '#ff7a2c' }),
    commands: SHOTO_COMMANDS,
  },
  {
    id: 'volt',
    name: 'VOLT',
    title: '雷霆鬥神 / Thunder Brawler',
    palette: {
      skin: '#caa07a', skinShade: '#a87b54',
      gi: '#2e7d32', giShade: '#1b5e20',
      hair: '#1a1a1a', accent: '#ffd54a', aura: '#ffe24a',
    },
    walkSpeed: 2.7, jumpStrength: 16.5, maxHealth: 1120,
    moves: buildMoves({ fireballColor: '#ffe24a', fireballGlow: '#fff6c0', auraColor: '#ffe24a', heavy: true }),
    commands: SHOTO_COMMANDS,
  },
  {
    id: 'mantis',
    name: 'MANTIS',
    title: '疾風刺客 / Wind Assassin',
    palette: {
      skin: '#d8a98a', skinShade: '#b3826180',
      gi: '#7b3fb5', giShade: '#5a2c86',
      hair: '#101018', accent: '#19e6c8', aura: '#19e6c8',
    },
    walkSpeed: 3.9, jumpStrength: 15, maxHealth: 920,
    moves: buildMoves({ fireballColor: '#19e6c8', fireballGlow: '#bafff3', auraColor: '#19e6c8', speedy: true }),
    commands: SHOTO_COMMANDS,
  },
];

export const getCharacter = (id: string): Character =>
  CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
