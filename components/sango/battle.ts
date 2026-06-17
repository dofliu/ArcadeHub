import { BattleState, BattleUnit, GameState, Officer, PendingBattle, Terrain, UnitType } from './types';

// ===========================================================================
// Tactical battle engine (KOEI-style). Grid map, unit types with rock-paper-
// scissors matchups, terrain, movement, melee & ranged attacks, the 火計 fire
// stratagem, morale and routing. Side-phase turn order; attacker wins by
// taking the castle or routing the defenders, defender wins on timeout.
// ===========================================================================

const W = 13, H = 9;
const MID = (H - 1) >> 1;
const MAX_ROUNDS = 20;

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cheby = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const manh = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

export const moveRange = (t: UnitType) => (t === 'cavalry' ? 6 : t === 'archer' ? 4 : 4);
export const atkRange = (t: UnitType) => (t === 'archer' ? 2 : 1);

const terrainCost = (t: Terrain): number => {
  switch (t) {
    case 'plain': case 'castle': return 1;
    case 'forest': return 2;
    case 'mountain': return 3;
    case 'gate': return 2;
    default: return 99; // water, wall — impassable
  }
};

// Defensive multiplier the terrain grants the occupant (lower = tougher to hurt).
const terrainDef = (t: Terrain): number => {
  switch (t) {
    case 'forest': return 0.8;
    case 'mountain': return 0.68;
    case 'castle': return 0.55;
    case 'gate': return 0.7;
    default: return 1;
  }
};

// Type advantage: cavalry > archer > infantry > cavalry.
function typeAdv(a: UnitType, d: UnitType): number {
  if (a === d) return 1;
  if (a === 'cavalry' && d === 'archer') return 1.3;
  if (a === 'archer' && d === 'infantry') return 1.3;
  if (a === 'infantry' && d === 'cavalry') return 1.3;
  return 0.82;
}

function makeTiles(): Terrain[][] {
  const t: Terrain[][] = [];
  for (let y = 0; y < H; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < W; x++) row.push('plain');
    t.push(row);
  }
  // River with two fords.
  for (let y = 0; y < H; y++) if (y !== 2 && y !== H - 3) t[y][5] = 'water';
  // Forest & mountain clusters.
  t[1][3] = 'forest'; t[2][3] = 'forest'; t[H - 2][3] = 'forest';
  t[1][8] = 'forest'; t[H - 2][8] = 'forest'; t[MID][2] = 'mountain'; t[H - 1][7] = 'mountain';
  // Castle wall on the right edge with a gate, castle keep behind the gate.
  for (let y = 0; y < H; y++) t[y][W - 1] = 'wall';
  t[MID][W - 1] = 'castle';
  t[MID][W - 2] = 'gate';
  return t;
}

export function createBattle(s: GameState, p: PendingBattle): BattleState {
  const tiles = makeTiles();
  const units: BattleUnit[] = [];
  const city = s.cities[p.cityId];

  // Attacker units enter from the left.
  const atkSlots = spread(p.army.length);
  p.army.forEach((a, i) => {
    const o = s.officers[a.officerId];
    units.push(mkUnit(o, 'atk', 1, atkSlots[i], a.soldiers));
  });

  // Defenders form up before the castle; the garrison is split among them.
  const defOffs = city.officers.map(id => s.officers[id]).filter(o => o.faction === city.faction);
  const defenderOfficers = defOffs.map(o => o.id);
  const share = defOffs.length ? Math.floor(city.troops / defOffs.length) : 0;
  const defSlots = spread(defOffs.length);
  defOffs.forEach((o, i) => {
    const sld = i === defOffs.length - 1 ? city.troops - share * (defOffs.length - 1) : share;
    units.push(mkUnit(o, 'def', W - 3, defSlots[i], Math.max(400, sld)));
  });

  return {
    w: W, h: H, tiles, units,
    side: 'atk', round: 1, maxRounds: MAX_ROUNDS,
    cityId: p.cityId, attacker: p.attacker, defender: p.defender,
    defenderOfficers,
    castle: { x: W - 1, y: MID },
    log: [`${s.factions[p.attacker].name} 進攻 ${city.name}！`],
    result: null, selected: null, reachable: [], mode: null, anim: null,
  };
}

function spread(n: number): number[] {
  if (n <= 1) return [MID];
  const out: number[] = [];
  const step = (H - 2) / (n - 1);
  for (let i = 0; i < n; i++) out.push(Math.round(1 + i * step));
  return out;
}

function mkUnit(o: Officer, side: 'atk' | 'def', x: number, y: number, hp: number): BattleUnit {
  return {
    officerId: o.id, side, x, y,
    hp, maxHp: hp, type: o.unitType,
    morale: clamp(55 + (o.led - 50), 25, 100),
    moved: false, acted: false, fire: 0,
  };
}

// ---- Queries --------------------------------------------------------------

export const unitAt = (bs: BattleState, x: number, y: number) =>
  bs.units.findIndex(u => u.x === x && u.y === y && u.hp > 0);
const inBounds = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H;
const live = (bs: BattleState, side: 'atk' | 'def') => bs.units.filter(u => u.side === side && u.hp > 0);

export function officerOf(s: GameState, u: BattleUnit) { return s.officers[u.officerId]; }

// BFS of tiles reachable by a unit this phase (cannot stop on occupied tiles).
export function reachable(bs: BattleState, idx: number): { x: number; y: number }[] {
  const u = bs.units[idx];
  const budget = moveRange(u.type);
  const best = new Map<string, number>();
  const out: { x: number; y: number }[] = [];
  const key = (x: number, y: number) => x + ',' + y;
  best.set(key(u.x, u.y), 0);
  const q: [number, number, number][] = [[u.x, u.y, 0]];
  while (q.length) {
    const [x, y, cost] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      const tc = terrainCost(bs.tiles[ny][nx]);
      if (tc >= 99) continue;
      const nc = cost + tc;
      if (nc > budget) continue;
      const occ = unitAt(bs, nx, ny);
      if (occ >= 0 && bs.units[occ].side !== u.side) continue; // can't pass enemies
      const k = key(nx, ny);
      if (best.has(k) && best.get(k)! <= nc) continue;
      best.set(k, nc);
      q.push([nx, ny, nc]);
      if (occ < 0) out.push({ x: nx, y: ny });
    }
  }
  return out;
}

// ---- Actions --------------------------------------------------------------

export function doMove(bs: BattleState, idx: number, x: number, y: number): boolean {
  const u = bs.units[idx];
  if (u.moved) return false;
  if (!reachable(bs, idx).some(t => t.x === x && t.y === y)) return false;
  u.x = x; u.y = y; u.moved = true;
  bs.selected = null; bs.reachable = [];
  return true;
}

export function canHit(bs: BattleState, ai: number, di: number): boolean {
  const a = bs.units[ai], d = bs.units[di];
  if (a.side === d.side || d.hp <= 0) return false;
  return manh(a.x, a.y, d.x, d.y) <= atkRange(a.type) && cheby(a.x, a.y, d.x, d.y) >= 1;
}

export function doAttack(s: GameState, bs: BattleState, ai: number, di: number): boolean {
  const a = bs.units[ai], d = bs.units[di];
  if (a.acted || !canHit(bs, ai, di)) return false;
  const ao = s.officers[a.officerId], dofc = s.officers[d.officerId];
  const dmg = computeDamage(bs, a, ao, d, dofc);
  d.hp = Math.max(0, d.hp - dmg);
  d.morale = clamp(d.morale - Math.round((dmg / d.maxHp) * 60) - 4, 0, 100);
  bs.log.unshift(`${ao.name} 攻擊 ${dofc.name}，殲滅 ${dmg} 兵。`);
  bs.anim = { kind: 'attack', x: d.x, y: d.y, timer: 16, text: '-' + dmg };
  // Counterattack from a surviving adjacent melee defender.
  if (d.hp > 0 && d.type !== 'archer' && cheby(a.x, a.y, d.x, d.y) === 1) {
    const cdmg = Math.round(computeDamage(bs, d, dofc, a, ao) * 0.6);
    a.hp = Math.max(0, a.hp - cdmg);
    a.morale = clamp(a.morale - Math.round((cdmg / a.maxHp) * 60), 0, 100);
    bs.log.unshift(`${dofc.name} 反擊，殲滅 ${cdmg} 兵。`);
  }
  a.acted = true; a.moved = true;
  routCheck(bs, d); routCheck(bs, a);
  checkEnd(bs);
  return true;
}

function computeDamage(bs: BattleState, a: BattleUnit, ao: Officer, d: BattleUnit, dofc: Officer): number {
  const base = a.hp * (a.type === 'archer' ? 0.045 : 0.055);
  const power = (ao.war * 0.7 + ao.led * 0.3) / 65;
  const adv = typeAdv(a.type, d.type);
  const tdef = terrainDef(bs.tiles[d.y][d.x]);
  const fireWeak = a.fire > 0 ? 0.8 : 1;
  const moraleMul = 0.6 + (a.morale / 100) * 0.5;
  let dmg = base * power * adv * tdef * fireWeak * moraleMul * (0.85 + Math.random() * 0.3);
  return clamp(Math.round(dmg), 1, d.hp);
}

export function doFire(s: GameState, bs: BattleState, idx: number, x: number, y: number): boolean {
  const u = bs.units[idx];
  if (u.acted) return false;
  const o = s.officers[u.officerId];
  if (o.int < 50) return false;                       // needs a capable strategist
  if (manh(u.x, u.y, x, y) > 3) return false;
  // Affect the target tile and its orthogonal neighbours.
  const area = [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
  let any = false;
  for (const [tx, ty] of area) {
    const ti = unitAt(bs, tx, ty);
    if (ti < 0) continue;
    const tu = bs.units[ti];
    if (tu.side === u.side) continue;
    const tofc = s.officers[tu.officerId];
    const success = ri(1, 100) <= clamp(45 + (o.int - tofc.int) / 2, 10, 92);
    if (success) {
      tu.fire = 3; any = true;
      const dmg = clamp(Math.round(tu.maxHp * 0.08), 1, tu.hp);
      tu.hp = Math.max(0, tu.hp - dmg);
      tu.morale = clamp(tu.morale - 14, 0, 100);
      routCheck(bs, tu);
    }
  }
  bs.log.unshift(any ? `${o.name} 施展火計，敵軍陷入火海！` : `${o.name} 的火計被識破了。`);
  bs.anim = { kind: 'fire', x, y, timer: 22 };
  u.acted = true; u.moved = true;
  bs.mode = null; bs.selected = null; bs.reachable = [];
  checkEnd(bs);
  return true;
}

function routCheck(bs: BattleState, u: BattleUnit) {
  if (u.hp <= 0 || u.morale <= 0) {
    if (u.hp > 0) bs.log.unshift(`${u.officerId} 部隊士氣崩潰，敗走！`);
    u.hp = 0;
  }
}

// ---- Phase / turn flow ----------------------------------------------------

// Apply burning damage at the start of a side's units, tick fire down.
function applyFire(bs: BattleState, side: 'atk' | 'def') {
  for (const u of bs.units) {
    if (u.side !== side || u.hp <= 0 || u.fire <= 0) continue;
    const dmg = clamp(Math.round(u.maxHp * 0.06), 1, u.hp);
    u.hp = Math.max(0, u.hp - dmg);
    u.morale = clamp(u.morale - 8, 0, 100);
    u.fire--;
    routCheck(bs, u);
  }
}

export function endPhase(bs: BattleState) {
  if (bs.result) return;
  bs.side = bs.side === 'atk' ? 'def' : 'atk';
  if (bs.side === 'atk') bs.round++;
  // New phase: burning damage, reset action flags for the moving side.
  applyFire(bs, bs.side);
  for (const u of bs.units) if (u.side === bs.side) { u.moved = false; u.acted = false; }
  bs.selected = null; bs.reachable = []; bs.mode = null;
  checkEnd(bs);
}

export function checkEnd(bs: BattleState) {
  if (bs.result) return;
  // Attacker takes the castle.
  const onCastle = bs.units.some(u => u.side === 'atk' && u.hp > 0 && u.x === bs.castle.x && u.y === bs.castle.y);
  if (onCastle) { bs.result = 'atk'; bs.log.unshift('攻方攻入本城，城池陷落！'); return; }
  if (live(bs, 'def').length === 0) { bs.result = 'atk'; bs.log.unshift('守軍全滅，城池陷落！'); return; }
  if (live(bs, 'atk').length === 0) { bs.result = 'def'; bs.log.unshift('攻軍全滅，守城成功！'); return; }
  if (bs.round > bs.maxRounds) { bs.result = 'def'; bs.log.unshift('攻城時限已盡，攻軍撤退。'); return; }
}

// ---- Battle AI ------------------------------------------------------------

// Performs the full phase for the AI-controlled side, then ends the phase.
export function aiBattleTurn(s: GameState, bs: BattleState) {
  const side = bs.side;
  const enemySide = side === 'atk' ? 'def' : 'atk';

  // Defenders hold the keep: occupy the castle and gate so the attacker must
  // break the garrison rather than simply walking in.
  if (side === 'def') {
    for (const hold of [bs.castle, { x: bs.castle.x - 1, y: bs.castle.y }]) {
      if (unitAt(bs, hold.x, hold.y) >= 0) continue;
      let bi = -1, bd = 1e9;
      for (let i = 0; i < bs.units.length; i++) {
        const u = bs.units[i];
        if (u.side !== 'def' || u.hp <= 0 || u.moved) continue;
        if (!reachable(bs, i).some(t => t.x === hold.x && t.y === hold.y)) continue;
        const d = cheby(u.x, u.y, hold.x, hold.y);
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi >= 0) doMove(bs, bi, hold.x, hold.y);
    }
  }

  for (let i = 0; i < bs.units.length; i++) {
    const u = bs.units[i];
    if (u.side !== side || u.hp <= 0 || u.acted) continue;
    const o = s.officers[u.officerId];

    // Fire stratagem on a juicy cluster (smart strategists only).
    if (o.int >= 78 && Math.random() < 0.35) {
      const target = bestFireTarget(s, bs, i);
      if (target) { doFire(s, bs, i, target.x, target.y); if (bs.result) { endPhase(bs); return; } continue; }
    }

    // Find the best enemy target (in range now, else move toward).
    let tgt = nearestEnemy(bs, u, enemySide);
    if (!tgt) continue;
    const ti = bs.units.indexOf(tgt);

    if (canHit(bs, i, ti)) {
      doAttack(s, bs, i, ti);
    } else {
      // Move toward the target (attacker also gravitates to the castle).
      const goal = side === 'atk' && Math.random() < 0.4 ? bs.castle : { x: tgt.x, y: tgt.y };
      stepToward(bs, i, goal.x, goal.y);
      const t2i = bs.units.indexOf(tgt);
      if (t2i >= 0 && canHit(bs, i, t2i)) doAttack(s, bs, i, t2i);
    }
    if (bs.result) { endPhase(bs); return; }
  }
  endPhase(bs);
}

function nearestEnemy(bs: BattleState, u: BattleUnit, side: 'atk' | 'def'): BattleUnit | null {
  let best: BattleUnit | null = null, bd = 1e9;
  for (const e of bs.units) {
    if (e.side !== side || e.hp <= 0) continue;
    const d = cheby(u.x, u.y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function bestFireTarget(s: GameState, bs: BattleState, idx: number): { x: number; y: number } | null {
  const u = bs.units[idx];
  let best: { x: number; y: number } | null = null, bestN = 0;
  for (const e of bs.units) {
    if (e.side === u.side || e.hp <= 0) continue;
    if (manh(u.x, u.y, e.x, e.y) > 3) continue;
    let n = 0;
    for (const e2 of bs.units) if (e2.side !== u.side && e2.hp > 0 && manh(e.x, e.y, e2.x, e2.y) <= 1) n++;
    if (n > bestN) { bestN = n; best = { x: e.x, y: e.y }; }
  }
  return best;
}

// Move one unit greedily toward (gx,gy) within its reach.
function stepToward(bs: BattleState, idx: number, gx: number, gy: number) {
  const u = bs.units[idx];
  const tiles = reachable(bs, idx);
  if (!tiles.length) { u.moved = true; return; }
  let best = { x: u.x, y: u.y }, bd = cheby(u.x, u.y, gx, gy);
  for (const t of tiles) {
    const d = cheby(t.x, t.y, gx, gy);
    if (d < bd) { bd = d; best = t; }
  }
  if (best.x !== u.x || best.y !== u.y) doMove(bs, idx, best.x, best.y);
  else u.moved = true;
}

// ---- Result ---------------------------------------------------------------

export function battleSurvivors(bs: BattleState, side: 'atk' | 'def'): number {
  return bs.units.filter(u => u.side === side && u.hp > 0).reduce((n, u) => n + u.hp, 0);
}
