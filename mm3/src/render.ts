// ===== All canvas rendering =====
import { GameState } from './types';
import { mapMap, monsterMap } from './data/content';

export const CW = 560;
export const CH = 360;
const CX = CW / 2;
const CY = CH / 2;
const SCALES = [1, 0.6, 0.36, 0.216, 0.13, 0.078];
const DIRV = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function opening(d: number) {
  const s = SCALES[d];
  return { l: CX - (CW / 2) * s, r: CX + (CW / 2) * s, t: CY - (CH / 2) * s, b: CY + (CH / 2) * s };
}
function quad(ctx: CanvasRenderingContext2D, p: number[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.lineTo(p[6], p[7]);
  ctx.closePath(); ctx.fill();
}

function isSolid(grid: string[], x: number, y: number): boolean {
  if (y < 0 || x < 0 || y >= grid.length || x >= grid[0].length) return true;
  const c = grid[y][x];
  return c === '#';
}
function isDoor(grid: string[], doors: Record<string, any> | undefined, x: number, y: number): boolean {
  if (grid[y]?.[x] === 'D') return true;
  return !!doors?.[`${x},${y}`];
}

export function drawDungeon(ctx: CanvasRenderingContext2D, g: GameState) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const lit = !!g.flags['light'];

  // ceiling / floor
  ctx.fillStyle = lit ? '#1a1330' : '#0c0913';
  ctx.fillRect(0, 0, CW, CH / 2);
  ctx.fillStyle = lit ? '#2a2440' : '#171327';
  ctx.fillRect(0, CH / 2, CW, CH / 2);

  const fwd = DIRV[g.pos.dir];
  const left = DIRV[(g.pos.dir + 3) % 4];
  const right = DIRV[(g.pos.dir + 1) % 4];
  let cx = g.pos.x, cy = g.pos.y;
  const maxDepth = 4;

  for (let s = 0; s <= maxDepth; s++) {
    const near = opening(s), far = opening(s + 1);
    const base = lit ? 40 : 18;
    const sideShade = Math.max(12, (lit ? 96 : 70) - s * 14);
    const frontShade = Math.max(base, (lit ? 120 : 96) - s * 16);
    const sideColor = `rgb(${sideShade},${sideShade - 6},${sideShade + 14})`;
    const frontColor = `rgb(${frontShade},${frontShade - 8},${frontShade + 16})`;

    // left/right walls
    if (isSolid(grid, cx + left.x, cy + left.y) || isDoorClosed(g, cx + left.x, cy + left.y)) {
      quad(ctx, [near.l, near.t, far.l, far.t, far.l, far.b, near.l, near.b], sideColor);
    }
    if (isSolid(grid, cx + right.x, cy + right.y) || isDoorClosed(g, cx + right.x, cy + right.y)) {
      quad(ctx, [near.r, near.t, far.r, far.t, far.r, far.b, near.r, near.b], sideColor);
    }
    // front
    const fx = cx + fwd.x, fy = cy + fwd.y;
    const frontDoorClosed = isDoorClosed(g, fx, fy);
    if (isSolid(grid, fx, fy) || frontDoorClosed) {
      ctx.fillStyle = frontDoorClosed ? '#5a3e8c' : frontColor;
      ctx.fillRect(far.l, far.t, far.r - far.l, far.b - far.t);
      if (frontDoorClosed) {
        ctx.fillStyle = '#e7b53b';
        ctx.fillRect((far.l + far.r) / 2 - (far.r - far.l) * 0.06, (far.t + far.b) / 2, (far.r - far.l) * 0.12, (far.b - far.t) * 0.12);
      }
      break;
    }
    // floor markers for special cells ahead
    const fkey = `${fx},${fy}`;
    const gkey = `${map.id}:${fkey}`;
    if (map.portals?.[fkey]) marker(ctx, far, '#4cc9f0');
    else if (map.chests?.[fkey] && !g.lootedChests.includes(gkey)) marker(ctx, far, '#e7b53b');
    else if (map.encounters?.[fkey] && !g.clearedEncounters.includes(gkey)) marker(ctx, far, '#9b2226');
    cx = fx; cy = fy;
  }
}

function isDoorClosed(g: GameState, x: number, y: number): boolean {
  const map = mapMap[g.pos.mapId];
  if (!isDoor(map.grid, map.doors, x, y)) return false;
  return !g.openedDoors.includes(`${map.id}:${x},${y}`);
}

function marker(ctx: CanvasRenderingContext2D, far: ReturnType<typeof opening>, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(far.l + (far.r - far.l) * 0.25, far.b - 8, (far.r - far.l) * 0.5, 6);
}

export function drawOverworld(ctx: CanvasRenderingContext2D, g: GameState) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const rows = grid.length, cols = grid[0].length;
  const tile = Math.floor(Math.min(CW / cols, CH / rows));
  const ox = Math.floor((CW - tile * cols) / 2);
  const oy = Math.floor((CH - tile * rows) / 2);

  const colors: Record<string, string> = {
    '#': '#2b2540', '.': '#3f6b3f', '~': '#27496d', '^': '#5b5b6b', 'T': '#234d20', 'S': '#3f6b3f',
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      ctx.fillStyle = colors[ch] || '#3f6b3f';
      ctx.fillRect(ox + x * tile, oy + y * tile, tile - 1, tile - 1);
      if (ch === 'T') { ctx.fillStyle = '#1b3a18'; ctx.beginPath(); ctx.arc(ox + x * tile + tile / 2, oy + y * tile + tile / 2, tile * 0.3, 0, Math.PI * 2); ctx.fill(); }
      if (ch === '^') { ctx.fillStyle = '#7a7a8c'; ctx.beginPath(); ctx.moveTo(ox + x * tile + tile / 2, oy + y * tile + tile * 0.2); ctx.lineTo(ox + x * tile + tile * 0.85, oy + y * tile + tile * 0.85); ctx.lineTo(ox + x * tile + tile * 0.15, oy + y * tile + tile * 0.85); ctx.fill(); }
    }
  }
  // portals
  for (const [key, portal] of Object.entries(map.portals || {})) {
    const [px, py] = key.split(',').map(Number);
    ctx.fillStyle = portal.toScreen === 'town' ? '#e7b53b' : '#4cc9f0';
    ctx.fillRect(ox + px * tile + tile * 0.2, oy + py * tile + tile * 0.2, tile * 0.6, tile * 0.6);
    ctx.fillStyle = '#120e1a';
    ctx.font = `${Math.floor(tile * 0.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(portal.toScreen === 'town' ? '城' : '城', ox + px * tile + tile / 2, oy + py * tile + tile * 0.72);
  }
  // encounters
  for (const key of Object.keys(map.encounters || {})) {
    if (g.clearedEncounters.includes(`${map.id}:${key}`)) continue;
    const [px, py] = key.split(',').map(Number);
    ctx.fillStyle = '#9b2226';
    ctx.beginPath(); ctx.arc(ox + px * tile + tile / 2, oy + py * tile + tile / 2, tile * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  // party
  const cxp = ox + g.pos.x * tile + tile / 2;
  const cyp = oy + g.pos.y * tile + tile / 2;
  const d = DIRV[g.pos.dir];
  ctx.fillStyle = '#4cc9f0';
  ctx.beginPath();
  ctx.moveTo(cxp + d.x * tile * 0.35, cyp + d.y * tile * 0.35);
  ctx.lineTo(cxp - d.x * tile * 0.3 + d.y * tile * 0.25, cyp - d.y * tile * 0.3 + d.x * tile * 0.25);
  ctx.lineTo(cxp - d.x * tile * 0.3 - d.y * tile * 0.25, cyp - d.y * tile * 0.3 - d.x * tile * 0.25);
  ctx.closePath(); ctx.fill();
  ctx.textAlign = 'start';
}

export function drawCombat(ctx: CanvasRenderingContext2D, g: GameState) {
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, '#1a0a1e');
  grad.addColorStop(1, '#06060c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
  const c = g.combat;
  if (!c) return;
  const n = c.monsters.length;
  c.monsters.forEach((m, i) => {
    const def = monsterMap[m.defId];
    const cols = Math.min(n, 6);
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const idxInRow = i % cols;
    const spread = CW / (inRow + 1);
    const mx = spread * (idxInRow + 1);
    const my = CH * 0.32 + row * 70;
    const dead = m.hp <= 0;
    ctx.globalAlpha = dead ? 0.18 : 1;
    const size = def.boss ? 60 : 26;
    ctx.fillStyle = def.color;
    if (def.boss) {
      ctx.fillRect(mx - size, my - size, size * 2, size * 2.2);
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath(); ctx.arc(mx - 22, my - 18, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 22, my - 18, 10, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(mx, my, size, size * 1.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0b12';
      ctx.beginPath(); ctx.arc(mx - 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!dead) {
      // hp bar
      const bw = def.boss ? 120 : 50;
      ctx.fillStyle = '#222';
      ctx.fillRect(mx - bw / 2, my - (def.boss ? size + 16 : size * 1.25 + 10), bw, 5);
      ctx.fillStyle = '#9b2226';
      ctx.fillRect(mx - bw / 2, my - (def.boss ? size + 16 : size * 1.25 + 10), bw * (m.hp / m.maxHp), 5);
    }
  });
  ctx.fillStyle = '#4cc9f0';
  ctx.font = '13px monospace';
  ctx.fillText(`ROUND ${c.round}`, 12, 22);
}

export function drawTitle(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, '#1a1330');
  grad.addColorStop(1, '#06060c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e7b53b';
  ctx.font = 'bold 34px serif';
  ctx.fillText('MIGHT & MAGIC III', CX, CY - 30);
  ctx.fillStyle = '#7c5cff';
  ctx.font = '20px serif';
  ctx.fillText('— Isles of Terra —', CX, CY + 4);
  ctx.fillStyle = '#9a93b3';
  ctx.font = '13px monospace';
  ctx.fillText('A standalone tribute', CX, CY + 36);
  ctx.textAlign = 'start';
}
