// ===== All canvas rendering =====
import { GameState } from './types';
import { mapMap, monsterMap } from './data/content';
import { MONSTER_SPRITES, drawSprite, EGA } from './sprites';

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

// ---- EGA post-process: pixelate + snap every pixel to the 16-colour EGA palette ----
const EGA_RGB = EGA.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as [number, number, number]);
const egaCache = new Map<number, number>();
function nearestEga(r: number, g: number, b: number): [number, number, number] {
  const key = (r >> 2 << 12) | (g >> 2 << 6) | (b >> 2);
  const hit = egaCache.get(key);
  if (hit !== undefined) return EGA_RGB[hit];
  let best = 0, bestD = Infinity;
  for (let i = 0; i < EGA_RGB.length; i++) {
    const [er, eg, eb] = EGA_RGB[i];
    const d = (r - er) * (r - er) + (g - eg) * (g - eg) + (b - eb) * (b - eb);
    if (d < bestD) { bestD = d; best = i; }
  }
  egaCache.set(key, best);
  return EGA_RGB[best];
}

// Pixelate into `block`-sized cells and quantise to EGA. Applied once per redraw.
export function egaPost(ctx: CanvasRenderingContext2D, block = 2) {
  const img = ctx.getImageData(0, 0, CW, CH);
  const d = img.data;
  for (let y = 0; y < CH; y += block) {
    for (let x = 0; x < CW; x += block) {
      const i = (y * CW + x) * 4;
      const [nr, ng, nb] = nearestEga(d[i], d[i + 1], d[i + 2]);
      for (let yy = 0; yy < block && y + yy < CH; yy++) {
        for (let xx = 0; xx < block && x + xx < CW; xx++) {
          const j = ((y + yy) * CW + (x + xx)) * 4;
          d[j] = nr; d[j + 1] = ng; d[j + 2] = nb; d[j + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
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
  egaPost(ctx);
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
      const tx = ox + x * tile, ty = oy + y * tile;
      ctx.fillStyle = colors[ch] || '#3f6b3f';
      ctx.fillRect(tx, ty, tile - 1, tile - 1);
      // EGA-style tile detailing (deterministic per cell)
      if (ch === '.' || ch === 'S') {
        ctx.fillStyle = '#2f5530';
        if ((x + y) % 2 === 0) ctx.fillRect(tx + tile * 0.25, ty + tile * 0.55, 2, 2);
        if ((x * 3 + y) % 3 === 0) ctx.fillRect(tx + tile * 0.65, ty + tile * 0.3, 2, 2);
      } else if (ch === '~') {
        ctx.fillStyle = '#3a6ea5';
        ctx.fillRect(tx + tile * 0.15, ty + tile * 0.35, tile * 0.4, 2);
        ctx.fillRect(tx + tile * 0.45, ty + tile * 0.65, tile * 0.4, 2);
      }
      if (ch === 'T') { ctx.fillStyle = '#1b3a18'; ctx.beginPath(); ctx.arc(tx + tile / 2, ty + tile / 2, tile * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#234d20'; ctx.fillRect(tx + tile * 0.45, ty + tile * 0.6, tile * 0.1, tile * 0.3); }
      if (ch === '^') { ctx.fillStyle = '#7a7a8c'; ctx.beginPath(); ctx.moveTo(tx + tile / 2, ty + tile * 0.2); ctx.lineTo(tx + tile * 0.85, ty + tile * 0.85); ctx.lineTo(tx + tile * 0.15, ty + tile * 0.85); ctx.fill(); ctx.fillStyle = '#cfd2dc'; ctx.beginPath(); ctx.moveTo(tx + tile / 2, ty + tile * 0.2); ctx.lineTo(tx + tile * 0.62, ty + tile * 0.45); ctx.lineTo(tx + tile * 0.38, ty + tile * 0.45); ctx.fill(); }
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
  egaPost(ctx);
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
    ctx.globalAlpha = dead ? 0.2 : 1;
    const sprite = MONSTER_SPRITES[m.defId];
    const size = def.boss ? 60 : 26;
    if (sprite) {
      // EGA pixel sprite, baseline anchored just below the row centre
      const px = def.boss ? 7 : 4;
      const baseY = my + (def.boss ? 64 : 40);
      drawSprite(ctx, sprite, mx, baseY, px);
    } else {
      // fallback blob for any monster without a sprite yet
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(mx, my, size, size * 1.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0b12';
      ctx.beginPath(); ctx.arc(mx - 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!dead) {
      // hp bar
      const bw = def.boss ? 120 : 50;
      const barY = my - (def.boss ? size + 16 : size * 1.25 + 10);
      ctx.fillStyle = '#222';
      ctx.fillRect(mx - bw / 2, barY, bw, 5);
      ctx.fillStyle = '#9b2226';
      ctx.fillRect(mx - bw / 2, barY, bw * (m.hp / m.maxHp), 5);
      // status icons
      const st = m.status;
      if (st) {
        let tag = '';
        if ((st.poison || 0) > 0) tag += '☠';
        if ((st.sleep || 0) > 0) tag += 'Z';
        if ((st.paralyze || 0) > 0) tag += '✋';
        if (tag) { ctx.fillStyle = '#a7f3d0'; ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillText(tag, mx, barY - 3); ctx.textAlign = 'start'; }
      }
    }
  });
  ctx.fillStyle = '#4cc9f0';
  ctx.font = '13px monospace';
  ctx.fillText(`ROUND ${c.round}`, 12, 22);
  egaPost(ctx);
}

// Screen position of monster `i`, matching drawCombat's layout.
export function monsterScreenPos(combat: GameState['combat'], i: number) {
  const n = combat!.monsters.length;
  const cols = Math.min(n, 6);
  const row = Math.floor(i / cols);
  const inRow = Math.min(cols, n - row * cols);
  const idxInRow = i % cols;
  const spread = CW / (inRow + 1);
  return { mx: spread * (idxInRow + 1), my: CH * 0.32 + row * 70 };
}

const ELEMENT_COLOR: Record<string, string> = {
  fire: '#FF5555', cold: '#55FFFF', shock: '#FFFF55', holy: '#FFFFFF', poison: '#55FF55', energy: '#FF55FF',
};

export interface ActiveFx { kind: string; side: string; idx: number; element?: string; age: number; } // age 0..1

// Draw combat effects on top of the (already EGA'd) combat scene.
export function drawFx(ctx: CanvasRenderingContext2D, g: GameState, effects: ActiveFx[]) {
  if (!g.combat) return;
  for (const e of effects) {
    const fade = 1 - e.age;
    if (e.side === 'party') {
      ctx.globalAlpha = fade * 0.4;
      ctx.fillStyle = e.kind === 'heal' ? '#55FF55' : '#FF5555';
      const t = 8;
      ctx.fillRect(0, 0, CW, t); ctx.fillRect(0, CH - t, CW, t);
      ctx.fillRect(0, 0, t, CH); ctx.fillRect(CW - t, 0, t, CH);
      ctx.globalAlpha = 1;
      continue;
    }
    const { mx, my } = monsterScreenPos(g.combat, e.idx);
    ctx.globalAlpha = fade;
    if (e.kind === 'hit' || e.kind === 'crit') {
      const big = e.kind === 'crit';
      ctx.strokeStyle = big ? '#FFFF55' : '#FFFFFF';
      ctx.lineWidth = big ? 3 : 2;
      const r = (big ? 34 : 22) * (0.4 + e.age * 1.2);
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
      const spikes = big ? 8 : 6;
      for (let k = 0; k < spikes; k++) {
        const a = (Math.PI * 2 * k) / spikes;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(a) * r * 0.5, my + Math.sin(a) * r * 0.5);
        ctx.lineTo(mx + Math.cos(a) * r, my + Math.sin(a) * r);
        ctx.stroke();
      }
    } else if (e.kind === 'spell') {
      const col = ELEMENT_COLOR[e.element || ''] || '#FFFFFF';
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(mx, my, 28 * (1 - e.age * 0.4), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, 14 + e.age * 26, 0, Math.PI * 2); ctx.stroke();
    } else if (e.kind === 'death') {
      ctx.fillStyle = '#AAAAAA';
      const r = 10 + e.age * 24;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI * 2 * k) / 6;
        ctx.fillRect(mx + Math.cos(a) * r - 2, my + Math.sin(a) * r - 2, 4, 4);
      }
    }
    ctx.globalAlpha = 1;
  }
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
  ctx.fillText('MIGHT & MAGIC II', CX, CY - 30);
  ctx.fillStyle = '#7c5cff';
  ctx.font = '20px serif';
  ctx.fillText('— Gates to Another World —', CX, CY + 4);
  ctx.fillStyle = '#9a93b3';
  ctx.font = '13px monospace';
  ctx.fillText('A standalone tribute', CX, CY + 36);
  ctx.textAlign = 'start';
  egaPost(ctx, 2);
}
