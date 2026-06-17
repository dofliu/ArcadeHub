import {
  Character, Move, Projectile, HitSpark, RoundBanner, FighterStateName,
} from './types';
import { getCharacter } from './characters';

// ===========================================================================
// Fighting-game simulation. Framework-free and deterministic given inputs, so
// the same engine drives PvP, the AI, and (potentially) test harnesses.
// World units: x is horizontal (0..WORLD_W), fy is feet height above the
// ground (0 = standing, positive = airborne). +x forward depends on facing.
// Runs at a fixed 60 logical steps per second.
// ===========================================================================

export const WORLD_W = 880;
export const WORLD_H = 360;
export const GROUND_Y = 330;          // screen y of the ground line
const GRAVITY = 0.92;
const PUSH_HALF = 26;                  // pushbox half-width
const HURT_HALF = 20;                  // hurtbox half-width
const HURT_TOP_STAND = 122;
const HURT_TOP_CROUCH = 80;
const FRICTION = 0.82;
const WALK_BACK_SCALE = 0.82;
const ROUND_TIME = 60 * 60;            // 60 seconds
const INTRO_TIME = 110;
const ROUNDEND_TIME = 150;
const WINS_NEEDED = 2;
const MAX_METER = 100;
const METER_SCALE = 0.12;
const DIZZY_THRESHOLD = 95;

export interface PlayerInput {
  left: boolean; right: boolean; up: boolean; down: boolean;
  lp: boolean; hp: boolean; lk: boolean; hk: boolean;
  lpP: boolean; hpP: boolean; lkP: boolean; hkP: boolean;
}

export const emptyInput = (): PlayerInput => ({
  left: false, right: false, up: false, down: false,
  lp: false, hp: false, lk: false, hk: false,
  lpP: false, hpP: false, lkP: false, hkP: false,
});

export interface Fighter {
  index: 0 | 1;
  char: Character;
  x: number; fy: number;
  vx: number; vy: number;
  facing: 1 | -1;
  state: FighterStateName;
  stateTimer: number;
  health: number;
  meter: number;
  // active move
  move: Move | null;
  moveKey: string | null;
  moveFrame: number;
  hasHit: boolean;
  projSpawned: boolean;
  canCancel: boolean;
  airActed: boolean;
  // stun / reactions
  stun: number;
  blocking: boolean;
  comboCount: number;
  comboDamage: number;
  bestCombo: number;
  hitFlash: number;
  dizzyMeter: number;
  // input history (facing-relative numpad), most-recent last
  buffer: { dir: number; frame: number }[];
  lastDir: number;
  // ai
  isAI: boolean;
  aiTimer: number;
  aiHold: number;
  aiCmd?: string;
  aiHoldDir?: 'fwd' | 'back' | 'crouchBack' | null;
  // round score
  wins: number;
}

export type Phase = 'intro' | 'fight' | 'roundend' | 'matchend';

export interface GameState {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[];
  sparks: HitSpark[];
  frame: number;
  hitstop: number;
  shake: number;
  phase: Phase;
  phaseTimer: number;
  round: number;
  timer: number;
  banner: RoundBanner | null;
  winner: 0 | 1 | null;       // round/match winner
  matchWinner: 0 | 1 | null;
  vsAI: boolean;
  aiLevel: 0 | 1 | 2;         // easy / normal / hard
}

// --------------------------------------------------------------------------
// Setup
// --------------------------------------------------------------------------

function makeFighter(index: 0 | 1, charId: string, isAI: boolean): Fighter {
  const char = getCharacter(charId);
  return {
    index, char,
    x: index === 0 ? WORLD_W * 0.34 : WORLD_W * 0.66,
    fy: 0, vx: 0, vy: 0,
    facing: index === 0 ? 1 : -1,
    state: 'idle', stateTimer: 0,
    health: char.maxHealth, meter: 0,
    move: null, moveKey: null, moveFrame: 0, hasHit: false,
    projSpawned: false, canCancel: false, airActed: false,
    stun: 0, blocking: false,
    comboCount: 0, comboDamage: 0, bestCombo: 0,
    hitFlash: 0, dizzyMeter: 0,
    buffer: [], lastDir: 5,
    isAI, aiTimer: 0, aiHold: 0, aiCmd: undefined, aiHoldDir: null,
    wins: 0,
  };
}

export function createGame(
  p0Char: string, p1Char: string, vsAI: boolean, aiLevel: 0 | 1 | 2,
): GameState {
  const state: GameState = {
    fighters: [makeFighter(0, p0Char, false), makeFighter(1, p1Char, vsAI)],
    projectiles: [], sparks: [],
    frame: 0, hitstop: 0, shake: 0,
    phase: 'intro', phaseTimer: INTRO_TIME,
    round: 1, timer: ROUND_TIME,
    banner: { text: 'ROUND 1', timer: INTRO_TIME, big: true },
    winner: null, matchWinner: null,
    vsAI, aiLevel,
  };
  return state;
}

function resetForRound(state: GameState) {
  const [a, b] = state.fighters;
  for (const f of [a, b]) {
    f.x = f.index === 0 ? WORLD_W * 0.34 : WORLD_W * 0.66;
    f.fy = 0; f.vx = 0; f.vy = 0;
    f.facing = f.index === 0 ? 1 : -1;
    f.state = 'idle'; f.stateTimer = 0;
    f.health = f.char.maxHealth;
    f.move = null; f.moveKey = null; f.moveFrame = 0; f.hasHit = false;
    f.projSpawned = false; f.canCancel = false; f.airActed = false;
    f.stun = 0; f.blocking = false;
    f.comboCount = 0; f.comboDamage = 0; f.hitFlash = 0; f.dizzyMeter = 0;
    f.buffer = []; f.lastDir = 5;
    // meter persists between rounds (classic behaviour)
  }
  state.projectiles = [];
  state.sparks = [];
  state.timer = ROUND_TIME;
  state.winner = null;
  state.hitstop = 0;
}

// --------------------------------------------------------------------------
// Input helpers
// --------------------------------------------------------------------------

function relDir(f: Fighter, input: PlayerInput): number {
  const forward = f.facing === 1 ? input.right : input.left;
  const back = f.facing === 1 ? input.left : input.right;
  const h = forward ? 1 : back ? -1 : 0;
  const v = input.up ? 1 : input.down ? -1 : 0;
  if (v === 1) return h === -1 ? 7 : h === 1 ? 9 : 8;
  if (v === -1) return h === -1 ? 1 : h === 1 ? 3 : 2;
  return h === -1 ? 4 : h === 1 ? 6 : 5;
}

function matchMotion(buffer: Fighter['buffer'], pattern: number[], now: number, window: number): boolean {
  let pi = 0;
  for (const e of buffer) {
    if (now - e.frame > window) continue;
    if (e.dir === pattern[pi]) {
      pi++;
      if (pi >= pattern.length) return true;
    }
  }
  return false;
}

// --------------------------------------------------------------------------
// Hit geometry
// --------------------------------------------------------------------------

function isCrouch(f: Fighter): boolean {
  return f.state === 'crouch' || f.state === 'crouchBlock' || f.state === 'crouchHit';
}

function hurtBox(f: Fighter) {
  const top = (isCrouch(f) ? HURT_TOP_CROUCH : HURT_TOP_STAND);
  return { x1: f.x - HURT_HALF, x2: f.x + HURT_HALF, y1: f.fy, y2: f.fy + top };
}

function activeHitBox(f: Fighter) {
  const m = f.move!;
  const hb = m.hitbox;
  if (hb.w <= 0 || hb.h <= 0) return null;
  const x1 = f.facing === 1 ? f.x + hb.x : f.x - hb.x - hb.w;
  const y1 = f.fy + hb.y;
  return { x1, x2: x1 + hb.w, y1, y2: y1 + hb.h };
}

function overlap(a: { x1: number; x2: number; y1: number; y2: number }, b: typeof a) {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

// --------------------------------------------------------------------------
// State transitions
// --------------------------------------------------------------------------

function addMeter(f: Fighter, raw: number) {
  f.meter = Math.min(MAX_METER, f.meter + raw * METER_SCALE);
}

function actionable(f: Fighter): boolean {
  return (f.state === 'idle' || f.state === 'walkF' || f.state === 'walkB' || f.state === 'crouch')
    && f.fy <= 0.001 && f.stun <= 0 && !f.move;
}

function startMove(f: Fighter, key: string) {
  const m = f.char.moves[key];
  if (!m) return;
  f.state = 'attack';
  f.move = m;
  f.moveKey = key;
  f.moveFrame = 0;
  f.hasHit = false;
  f.projSpawned = false;
  f.canCancel = false;
  f.vx = 0;
  if (m.meterCost > 0) f.meter = Math.max(0, f.meter - m.meterCost);
  if (f.fy > 0.001) f.airActed = true;
}

// Try to launch a move from the current input. Returns true if one started.
function tryAttack(f: Fighter, input: PlayerInput, now: number): boolean {
  const grounded = f.fy <= 0.001;
  const pressed: ('lp' | 'hp' | 'lk' | 'hk')[] = [];
  if (input.hpP) pressed.push('hp');
  if (input.hkP) pressed.push('hk');
  if (input.lpP) pressed.push('lp');
  if (input.lkP) pressed.push('lk');
  if (pressed.length === 0) return false;

  // Specials (need a motion + button). Highest priority match wins.
  if (grounded) {
    const sorted = [...f.char.commands].sort((a, b) => b.priority - a.priority);
    for (const cmd of sorted) {
      if (!cmd.buttons.some(b => pressed.includes(b))) continue;
      if (!matchMotion(f.buffer, cmd.motion, now, 18)) continue;
      const m = f.char.moves[cmd.move];
      if (m.meterCost > 0 && f.meter < m.meterCost) continue;
      startMove(f, cmd.move);
      f.buffer = [];
      return true;
    }
  }

  const btn = pressed[0]; // strongest pressed button
  // Air normals
  if (!grounded) {
    if (f.airActed) return false;
    startMove(f, (btn === 'lp' || btn === 'hp') ? 'jp' : 'jk');
    return true;
  }
  // Crouching normals
  if (input.down) {
    if (btn === 'lp' || btn === 'hp') startMove(f, 'clp');
    else if (btn === 'hk') startMove(f, 'chk');
    else startMove(f, 'clk');
    return true;
  }
  // Standing normals
  startMove(f, btn);
  return true;
}

// Cancel an active, already-connected move into a special / super.
function tryCancel(f: Fighter, input: PlayerInput, now: number): boolean {
  if (!f.canCancel) return false;
  const pressed: ('lp' | 'hp' | 'lk' | 'hk')[] = [];
  if (input.hpP) pressed.push('hp');
  if (input.hkP) pressed.push('hk');
  if (input.lpP) pressed.push('lp');
  if (input.lkP) pressed.push('lk');
  if (pressed.length === 0) return false;
  const sorted = [...f.char.commands].sort((a, b) => b.priority - a.priority);
  for (const cmd of sorted) {
    if (!cmd.buttons.some(b => pressed.includes(b))) continue;
    if (!matchMotion(f.buffer, cmd.motion, now, 18)) continue;
    const m = f.char.moves[cmd.move];
    if (m.meterCost > 0 && f.meter < m.meterCost) continue;
    startMove(f, cmd.move);
    f.buffer = [];
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------
// Damage application (shared by normals and projectiles)
// --------------------------------------------------------------------------

function applyHit(
  state: GameState, attacker: Fighter, victim: Fighter,
  opts: { damage: number; chip: number; hitstun: number; blockstun: number;
    hitHeight: Move['hitHeight']; kbx: number; kby: number; launches: boolean;
    meterGain: number; source: 'attack' | 'projectile'; input: PlayerInput },
) {
  const grounded = victim.fy <= 0.001;
  const back = victim.facing === 1 ? opts.input.left : opts.input.right;
  const crouchHold = opts.input.down;
  const canAct = victim.state !== 'hit' && victim.state !== 'crouchHit'
    && victim.state !== 'launched' && victim.state !== 'attack'
    && victim.state !== 'knockdown' && victim.state !== 'dizzy' && victim.stun <= 0;
  // Block validity: must hold back, be grounded & able to react, height-correct.
  let blocked = grounded && back && canAct;
  if (blocked) {
    if (opts.hitHeight === 'low' && !crouchHold) blocked = false;
    if (opts.hitHeight === 'overhead' && crouchHold) blocked = false;
  }

  const dir = attacker.facing; // push victim away from attacker
  if (blocked) {
    victim.stun = opts.blockstun;
    victim.state = crouchHold ? 'crouchBlock' : 'block';
    victim.blocking = true;
    victim.health = Math.max(1, victim.health - opts.chip);
    victim.vx = 2.2 * dir;
    attacker.vx = -1.2 * dir;
    addMeter(attacker, opts.meterGain * 0.3);
    addMeter(victim, opts.meterGain * 0.5);
    state.hitstop = Math.min(8, 4 + Math.floor(opts.damage / 40));
    state.sparks.push({ x: victim.x + (HURT_HALF + 4) * -dir, y: GROUND_Y - (victim.fy + (crouchHold ? 50 : 80)),
      life: 10, maxLife: 10, kind: 'block', color: '#bfe9ff' });
    attacker.comboCount = 0;
  } else {
    victim.health = Math.max(0, victim.health - opts.damage);
    victim.stun = opts.hitstun;
    victim.blocking = false;
    victim.hitFlash = 6;
    victim.move = null; victim.moveKey = null; // hit interrupts attacks
    victim.dizzyMeter += opts.hitstun;
    const launched = opts.launches || !grounded;
    if (launched) {
      victim.state = 'launched';
      victim.fy = Math.max(victim.fy, 1);
      victim.vy = opts.kby > 0 ? opts.kby : 9;
      victim.vx = (4 + opts.kbx) * dir;
    } else {
      victim.state = isCrouch(victim) ? 'crouchHit' : 'hit';
      victim.vx = (3 + opts.kbx) * dir;
    }
    // Combo tracking on the attacker
    attacker.comboCount += 1;
    attacker.comboDamage += opts.damage;
    attacker.bestCombo = Math.max(attacker.bestCombo, attacker.comboCount);
    addMeter(attacker, opts.meterGain);
    addMeter(victim, opts.meterGain * 0.35);
    state.hitstop = Math.min(14, 6 + Math.floor(opts.damage / 22));
    state.shake = Math.min(14, 5 + Math.floor(opts.damage / 25));
    const spx = victim.x + (HURT_HALF) * -dir;
    const spy = GROUND_Y - (victim.fy + (isCrouch(victim) ? 50 : 78));
    state.sparks.push({ x: spx, y: spy, life: 14, maxLife: 14,
      kind: opts.source === 'projectile' ? 'super' : 'hit',
      color: opts.source === 'projectile' ? attacker.char.palette.aura : '#fff2a8' });
    // Dizzy check
    if (victim.dizzyMeter >= DIZZY_THRESHOLD && grounded) {
      victim.dizzyMeter = 0;
      victim.state = 'dizzy';
      victim.stun = 130;
    }
  }
}

// --------------------------------------------------------------------------
// Per-fighter step
// --------------------------------------------------------------------------

function stepFighter(state: GameState, f: Fighter, opp: Fighter, input: PlayerInput) {
  const now = state.frame;
  if (f.hitFlash > 0) f.hitFlash--;
  if (f.dizzyMeter > 0 && f.stun <= 0) f.dizzyMeter = Math.max(0, f.dizzyMeter - 0.4);

  // Record directional history for motion inputs (only on change).
  const dir = relDir(f, input);
  if (dir !== f.lastDir) {
    f.buffer.push({ dir, frame: now });
    if (f.buffer.length > 24) f.buffer.shift();
    f.lastDir = dir;
  }

  const grounded = f.fy <= 0.001;

  // ---- Locked / reaction states ----
  if (f.state === 'knockdown') {
    f.vx *= FRICTION;
    f.stateTimer--;
    if (f.stateTimer <= 0) { f.state = 'getup'; f.stateTimer = 18; }
    return;
  }
  if (f.state === 'getup') {
    f.stateTimer--;
    if (f.stateTimer <= 0) f.state = 'idle';
    return;
  }
  if (f.state === 'dizzy') {
    f.stun--;
    f.vx *= FRICTION;
    if (f.stun <= 0) { f.state = 'idle'; f.dizzyMeter = 0; }
    return;
  }
  if (f.state === 'victory') { f.vx *= FRICTION; return; }

  // ---- Stun (hit / block) ----
  if (f.stun > 0 && (f.state === 'hit' || f.state === 'crouchHit' || f.state === 'block' || f.state === 'crouchBlock' || f.state === 'launched')) {
    f.stun--;
    if (f.state !== 'launched') f.vx *= FRICTION;
    if (f.stun <= 0 && f.state !== 'launched') {
      f.state = 'idle'; f.blocking = false; f.comboCount = 0;
    }
    // launched continues into airborne physics below
    if (f.state !== 'launched') return;
  }

  // ---- Active move ----
  if (f.move) {
    const m = f.move;
    const total = m.startup + m.active + m.recovery;
    // Spawn projectile at the start of the active window.
    if (m.projectile && !f.projSpawned && f.moveFrame >= m.startup) {
      f.projSpawned = true;
      const px = f.x + (PUSH_HALF + 6) * f.facing;
      state.projectiles.push({
        owner: f.index, x: px, y: m.projectile.yOffset,
        vx: m.projectile.speed * f.facing, spec: m.projectile,
        life: m.projectile.life, hit: false,
      });
    }
    // Forward momentum on lunging moves.
    if (m.forwardMomentum && f.moveFrame >= m.startup && f.moveFrame < m.startup + m.active) {
      f.x += m.forwardMomentum * f.facing;
    }
    // Allow cancel into specials once the move has connected.
    tryCancel(f, input, now);
    if (f.move) {
      f.moveFrame++;
      if (f.moveFrame >= total || (m.airOnly && grounded && f.moveFrame > 2)) {
        f.move = null; f.moveKey = null; f.canCancel = false;
        f.state = grounded ? (input.down ? 'crouch' : 'idle') : 'jump';
      }
    }
    if (!grounded) airPhysics(f);
    return;
  }

  // ---- Airborne (jumping, no active move) ----
  if (!grounded) {
    airPhysics(f);
    if (actionableAir(f)) tryAttack(f, input, now);
    if (f.fy <= 0.001) { f.fy = 0; f.vy = 0; f.airActed = false; f.state = 'idle'; }
    return;
  }

  // ---- Grounded & actionable ----
  // Face the opponent when neutral.
  f.facing = opp.x >= f.x ? 1 : -1;

  if (tryAttack(f, input, now)) return;

  // Jump
  if (input.up) {
    f.fy = 1; f.vy = f.char.jumpStrength;
    const fwd = f.facing === 1 ? input.right : input.left;
    const bwd = f.facing === 1 ? input.left : input.right;
    f.vx = fwd ? f.char.walkSpeed * 1.1 * f.facing : bwd ? -f.char.walkSpeed * 1.1 * f.facing : 0;
    f.state = 'jump'; f.airActed = false;
    return;
  }
  // Crouch
  if (input.down) {
    f.state = 'crouch';
    f.vx = 0;
    return;
  }
  // Walk
  const forward = f.facing === 1 ? input.right : input.left;
  const back = f.facing === 1 ? input.left : input.right;
  if (forward) { f.x += f.char.walkSpeed * f.facing; f.state = 'walkF'; }
  else if (back) { f.x -= f.char.walkSpeed * WALK_BACK_SCALE * f.facing; f.state = 'walkB'; }
  else { f.state = 'idle'; }
}

function airPhysics(f: Fighter) {
  f.fy += f.vy * 0.5;
  f.vy -= GRAVITY;
  f.fy += f.vy * 0.5;
  f.x += f.vx;
  if (f.fy <= 0) {
    f.fy = 0; f.vy = 0;
    if (f.state === 'launched') {
      f.state = 'knockdown'; f.stateTimer = 36; f.stun = 0;
    } else if (!f.move) {
      f.state = 'idle'; f.airActed = false;
    }
  }
}

function actionableAir(f: Fighter): boolean {
  return f.fy > 0.001 && !f.move && !f.airActed && f.stun <= 0 && f.state === 'jump';
}

// --------------------------------------------------------------------------
// Collision resolution between bodies
// --------------------------------------------------------------------------

function resolvePush(a: Fighter, b: Fighter) {
  // Keep both inside the arena.
  for (const f of [a, b]) f.x = Math.max(PUSH_HALF, Math.min(WORLD_W - PUSH_HALF, f.x));
  // Separate overlapping pushboxes when both are grounded-ish.
  const dx = b.x - a.x;
  const dist = Math.abs(dx);
  const minDist = PUSH_HALF * 2 - 6;
  if (dist < minDist && a.fy < 60 && b.fy < 60) {
    const push = (minDist - dist) / 2;
    const sign = dx >= 0 ? 1 : -1;
    a.x -= push * sign;
    b.x += push * sign;
    a.x = Math.max(PUSH_HALF, Math.min(WORLD_W - PUSH_HALF, a.x));
    b.x = Math.max(PUSH_HALF, Math.min(WORLD_W - PUSH_HALF, b.x));
  }
}

// --------------------------------------------------------------------------
// AI: synthesises a PlayerInput for the CPU fighter.
// --------------------------------------------------------------------------

function aiInput(state: GameState, f: Fighter, opp: Fighter): PlayerInput {
  const input = emptyInput();
  if (state.phase !== 'fight') return input;
  const lvl = state.aiLevel;
  const dx = opp.x - f.x;
  const dist = Math.abs(dx);
  const toward = dx >= 0; // opponent to the right
  const pressForward = () => { if (toward) input.right = true; else input.left = true; };
  const pressBack = () => { if (toward) input.left = true; else input.right = true; };

  // React: block when the opponent is attacking in range or a projectile nears.
  const reactChance = [0.45, 0.72, 0.92][lvl];
  const incomingProj = state.projectiles.some(p => p.owner !== f.index &&
    Math.sign(p.vx) === (toward ? -1 : 1) && Math.abs(p.x - f.x) < 220);
  const oppAttacking = opp.move && opp.moveFrame < opp.move.startup + opp.move.active + 4;

  f.aiTimer--;
  if (f.aiTimer > 0 && f.aiHold > 0) {
    // Continue a committed action (walk/block) for a few frames.
    f.aiHold--;
    if (f.aiHoldDir === 'back') pressBack();
    else if (f.aiHoldDir === 'fwd') pressForward();
    else if (f.aiHoldDir === 'crouchBack') { pressBack(); input.down = true; }
    return input;
  }

  if ((oppAttacking && dist < 150 && Math.random() < reactChance) ||
      (incomingProj && Math.random() < reactChance)) {
    // Block: crouch-block lows, else stand. Guess based on opponent move.
    const low = opp.move?.hitHeight === 'low';
    f.aiHold = 14; f.aiTimer = 16; f.aiHoldDir = low || Math.random() < 0.4 ? 'crouchBack' : 'back';
    if (f.aiHoldDir === 'crouchBack') input.down = true;
    pressBack();
    return input;
  }

  if (!actionable(f)) return input;

  // Decide a fresh action.
  f.aiTimer = [20, 14, 9][lvl];
  const aggr = [0.4, 0.62, 0.82][lvl];

  // Anti-air with uppercut if opponent is jumping in close.
  if (opp.fy > 40 && dist < 110 && Math.random() < aggr) {
    f.aiCmd = 'uppercut';
    return input;
  }

  if (dist > 300) {
    // Far: throw fireball or approach.
    if (Math.random() < 0.5) { f.aiCmd = 'fireball'; return input; }
    f.aiHold = 10; f.aiHoldDir = 'fwd'; pressForward();
    return input;
  }

  if (dist > 130) {
    // Mid: approach, occasional projectile / super.
    const r = Math.random();
    if (f.meter >= MAX_METER && r < 0.25) { f.aiCmd = 'super'; return input; }
    if (r < 0.3) { f.aiCmd = 'fireball'; return input; }
    if (r < 0.45 + aggr * 0.3) { f.aiHold = 10; f.aiHoldDir = 'fwd'; pressForward(); return input; }
    f.aiHold = 8; f.aiHoldDir = 'back'; pressBack(); return input;
  }

  // Close range: attack.
  if (Math.random() < aggr) {
    const r = Math.random();
    if (f.meter >= MAX_METER && r < 0.18) { f.aiCmd = 'super'; return input; }
    if (r < 0.18) { f.aiCmd = 'spinkick'; return input; }
    if (r < 0.34) { f.aiCmd = 'uppercut'; return input; }
    if (r < 0.55) { input.down = true; input.lkP = true; input.lk = true; return input; } // low
    if (r < 0.78) { input.hkP = true; input.hk = true; return input; }
    input.lpP = true; input.lp = true; return input;
  }
  // Defensive hold
  f.aiHold = 10; f.aiHoldDir = 'back'; pressBack();
  return input;
}

// --------------------------------------------------------------------------
// Main step
// --------------------------------------------------------------------------

export function stepGame(state: GameState, rawInputs: [PlayerInput, PlayerInput]): GameState {
  state.frame++;

  // Banner / spark / shake decay always advance.
  if (state.banner) { state.banner.timer--; if (state.banner.timer <= 0) state.banner = null; }
  for (let i = state.sparks.length - 1; i >= 0; i--) {
    state.sparks[i].life--; if (state.sparks[i].life <= 0) state.sparks.splice(i, 1);
  }
  if (state.shake > 0) state.shake *= 0.85;

  // Hitstop freezes gameplay but not visuals.
  if (state.hitstop > 0) { state.hitstop--; return state; }

  const [a, b] = state.fighters;

  // Resolve inputs (AI overrides for CPU fighters during a fight).
  const inputs: [PlayerInput, PlayerInput] = [rawInputs[0], rawInputs[1]];
  for (const f of [a, b]) {
    f.aiCmd = undefined;
    if (f.isAI) inputs[f.index] = aiInput(state, f, f.index === 0 ? b : a);
  }

  // Phase handling.
  if (state.phase === 'intro') {
    state.phaseTimer--;
    if (state.phaseTimer <= INTRO_TIME - 50 && state.banner && state.banner.text.startsWith('ROUND')) {
      state.banner = { text: 'FIGHT!', timer: 50, big: true };
    }
    if (state.phaseTimer <= 0) { state.phase = 'fight'; }
    // Fighters idle during intro.
    return state;
  }

  if (state.phase === 'fight') {
    state.timer--;
    // AI command dispatch (specials) before the normal step.
    for (const f of [a, b]) {
      if (f.isAI && f.aiCmd && actionable(f)) {
        const m = f.char.moves[f.aiCmd];
        if (m && (m.meterCost === 0 || f.meter >= m.meterCost)) startMove(f, f.aiCmd);
        f.aiCmd = undefined;
      }
    }
    stepFighter(state, a, b, inputs[0]);
    stepFighter(state, b, a, inputs[1]);
    resolvePush(a, b);

    resolveCombat(state, a, b, inputs);
    stepProjectiles(state, inputs);

    // Round end conditions.
    const ko = a.health <= 0 || b.health <= 0;
    const timeUp = state.timer <= 0;
    if (ko || timeUp) endRound(state, ko, timeUp);
    return state;
  }

  if (state.phase === 'roundend') {
    // Let physics settle (loser falls), winner can pose.
    stepFighter(state, a, b, emptyInput());
    stepFighter(state, b, a, emptyInput());
    resolvePush(a, b);
    stepProjectiles(state, [emptyInput(), emptyInput()]);
    state.phaseTimer--;
    // Winner strikes a victory pose once grounded and the loser is down.
    if (state.winner !== null) {
      const w = state.fighters[state.winner];
      const l = state.fighters[state.winner === 0 ? 1 : 0];
      if (l.fy <= 0.001 && (l.state === 'knockdown' || l.health <= 0) && state.phaseTimer < ROUNDEND_TIME - 40
        && w.state !== 'victory' && w.fy <= 0.001) {
        w.state = 'victory';
      }
    }
    if (state.phaseTimer <= 0) {
      if (state.matchWinner !== null) {
        state.phase = 'matchend';
        state.banner = {
          text: state.matchWinner === 0
            ? (state.vsAI ? 'YOU WIN' : 'PLAYER 1 WINS')
            : (state.vsAI ? 'YOU LOSE' : 'PLAYER 2 WINS'),
          timer: 99999, big: true,
        };
      } else {
        state.round++;
        resetForRound(state);
        state.phase = 'intro';
        state.phaseTimer = INTRO_TIME;
        state.banner = { text: 'ROUND ' + state.round, timer: INTRO_TIME, big: true };
      }
    }
    return state;
  }

  // matchend: hold.
  return state;
}

function resolveCombat(state: GameState, a: Fighter, b: Fighter, inputs: [PlayerInput, PlayerInput]) {
  for (const [atk, vic] of [[a, b], [b, a]] as [Fighter, Fighter][]) {
    if (!atk.move) continue;
    const m = atk.move;
    const inActive = atk.moveFrame > m.startup && atk.moveFrame <= m.startup + m.active;
    if (!inActive || atk.hasHit) continue;
    const hb = activeHitBox(atk);
    if (!hb) continue;
    // Invulnerable victims (wakeup / knockdown / getup) can't be hit.
    if (vic.state === 'knockdown' || vic.state === 'getup') continue;
    if (overlap(hb, hurtBox(vic))) {
      atk.hasHit = true;
      applyHit(state, atk, vic, {
        damage: m.damage, chip: m.chip, hitstun: m.hitstun, blockstun: m.blockstun,
        hitHeight: m.hitHeight, kbx: m.knockback.x, kby: m.knockback.y, launches: m.launches,
        meterGain: m.meterGain, source: 'attack', input: inputs[vic.index],
      });
      if (m.cancelable) atk.canCancel = true;
    }
  }
}

function stepProjectiles(state: GameState, inputs: [PlayerInput, PlayerInput]) {
  const ps = state.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (!p.hit) p.x += p.vx;
    p.life--;
    // Opposing projectiles cancel on contact.
    for (let j = i - 1; j >= 0; j--) {
      const q = ps[j];
      if (q.owner !== p.owner && Math.abs(p.x - q.x) < (p.spec.w + q.spec.w) / 2 && !p.spec.super && !q.spec.super) {
        state.sparks.push({ x: (p.x + q.x) / 2, y: GROUND_Y - p.y, life: 12, maxLife: 12, kind: 'block', color: '#ffffff' });
        ps.splice(i, 1); ps.splice(j, 1);
        i--;
        break;
      }
    }
    if (i >= ps.length) continue;
    if (ps[i] !== p) continue;
    const vic = state.fighters[p.owner === 0 ? 1 : 0];
    const atk = state.fighters[p.owner];
    if (!p.hit && vic.state !== 'knockdown' && vic.state !== 'getup') {
      const box = { x1: p.x - p.spec.w / 2, x2: p.x + p.spec.w / 2, y1: p.y - p.spec.h / 2, y2: p.y + p.spec.h / 2 };
      if (overlap(box, hurtBox(vic))) {
        applyHit(state, atk, vic, {
          damage: p.spec.damage, chip: Math.round(p.spec.damage * 0.12),
          hitstun: p.spec.hitstun, blockstun: p.spec.blockstun, hitHeight: 'mid',
          kbx: p.spec.super ? 8 : 4, kby: p.spec.super ? 10 : 0, launches: !!p.spec.super,
          meterGain: 40, source: 'projectile', input: inputs[vic.index],
        });
        if (!p.spec.super) { ps.splice(i, 1); continue; }
        p.hit = true; p.life = Math.min(p.life, 10);
      }
    }
    if (p.x < -60 || p.x > WORLD_W + 60 || p.life <= 0) ps.splice(i, 1);
  }
}

function endRound(state: GameState, ko: boolean, timeUp: boolean) {
  const [a, b] = state.fighters;
  let winner: 0 | 1 | null = null;
  if (a.health <= 0 && b.health <= 0) winner = null; // double KO -> draw
  else if (a.health <= 0) winner = 1;
  else if (b.health <= 0) winner = 0;
  else if (timeUp) winner = a.health >= b.health ? (a.health === b.health ? null : 0) : 1;

  if (winner !== null) state.fighters[winner].wins++;
  state.winner = winner;
  state.phase = 'roundend';
  state.phaseTimer = ROUNDEND_TIME;
  state.banner = { text: ko ? 'K.O.' : 'TIME UP', timer: ROUNDEND_TIME, big: true };

  // Put the loser into a hit/launched reaction if still standing.
  if (winner !== null) {
    const loser = state.fighters[winner === 0 ? 1 : 0];
    if (loser.fy <= 0.001 && loser.state !== 'knockdown') {
      loser.state = 'launched'; loser.fy = 1; loser.vy = 8;
      loser.vx = 5 * state.fighters[winner].facing; loser.move = null; loser.stun = 0;
    }
    if (state.fighters[winner].wins >= WINS_NEEDED) state.matchWinner = winner;
  }
}
