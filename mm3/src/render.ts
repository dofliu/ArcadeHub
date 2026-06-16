// ===== All canvas rendering =====
import { GameState, MonsterDef } from './types';
import { mapMap, monsterMap } from './data/content';

export const CW = 560;
export const CH = 360;
const CX = CW / 2;
const CY = CH / 2;
const SCALES = [1, 0.62, 0.38, 0.23, 0.14, 0.085];
const DIRV = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
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

// ===== Dungeon first-person =====
export function drawDungeon(ctx: CanvasRenderingContext2D, g: GameState) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const lit = !!g.flags['light'];
  const sky = map.skyColor || '#1a1330';

  // ceiling gradient
  const cg = ctx.createLinearGradient(0, 0, 0, CH / 2);
  cg.addColorStop(0, shade(sky, lit ? 1.1 : 0.55));
  cg.addColorStop(1, shade(sky, lit ? 0.7 : 0.3));
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, CW, CH / 2);
  // floor gradient
  const fg = ctx.createLinearGradient(0, CH / 2, 0, CH);
  fg.addColorStop(0, shade(sky, lit ? 0.5 : 0.25));
  fg.addColorStop(1, shade(sky, lit ? 0.9 : 0.45));
  ctx.fillStyle = fg;
  ctx.fillRect(0, CH / 2, CW, CH / 2);

  const fwd = DIRV[g.pos.dir];
  const left = DIRV[(g.pos.dir + 3) % 4];
  const right = DIRV[(g.pos.dir + 1) % 4];
  let cx = g.pos.x, cy = g.pos.y;
  const maxDepth = 5;

  for (let s = 0; s <= maxDepth; s++) {
    const near = opening(s), far = opening(s + 1);
    const base = lit ? 44 : 20;
    const sideShade = Math.max(12, (lit ? 100 : 74) - s * 14);
    const frontShade = Math.max(base, (lit ? 124 : 100) - s * 16);
    const sideColor = `rgb(${sideShade},${sideShade - 6},${sideShade + 14})`;
    const frontColor = `rgb(${frontShade},${frontShade - 8},${frontShade + 16})`;

    // left/right walls (as trapezoids) + brick seams + torches
    const leftSolid = isSolid(grid, cx + left.x, cy + left.y) || isDoorClosed(g, cx + left.x, cy + left.y);
    const rightSolid = isSolid(grid, cx + right.x, cy + right.y) || isDoorClosed(g, cx + right.x, cy + right.y);
    if (leftSolid) {
      quad(ctx, [near.l, near.t, far.l, far.t, far.l, far.b, near.l, near.b], sideColor);
      seam(ctx, near.l, near.t, far.l, far.t, far.l, far.b, near.l, near.b, sideShade);
    }
    if (rightSolid) {
      quad(ctx, [near.r, near.t, far.r, far.t, far.r, far.b, near.r, near.b], sideColor);
      seam(ctx, near.r, near.t, far.r, far.t, far.r, far.b, near.r, near.b, sideShade);
    }
    // torches on alternating depths (skip the nearest, too big)
    if ((s === 1 || s === 3) && s < maxDepth) {
      const tx = (near.l + far.l) / 2, ty = (near.t + far.t) / 2 + (far.b - far.t) * 0.18;
      const tscale = SCALES[s] * 1.1;
      if (leftSolid) torch(ctx, tx, ty, tscale, lit);
      const tx2 = (near.r + far.r) / 2;
      if (rightSolid) torch(ctx, tx2, ty, tscale, lit);
    }
    // front wall
    const fx = cx + fwd.x, fy = cy + fwd.y;
    const frontDoorClosed = isDoorClosed(g, fx, fy);
    if (isSolid(grid, fx, fy) || frontDoorClosed) {
      ctx.fillStyle = frontDoorClosed ? '#5a3e8c' : frontColor;
      ctx.fillRect(far.l, far.t, far.r - far.l, far.b - far.t);
      // brick lines on front
      ctx.strokeStyle = `rgba(0,0,0,0.28)`;
      ctx.lineWidth = 1;
      const fw = far.r - far.l, fh = far.b - far.t;
      for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(far.l, far.t + (fh * r) / 4); ctx.lineTo(far.r, far.t + (fh * r) / 4); ctx.stroke(); }
      for (let cc = 1; cc < 3; cc++) { ctx.beginPath(); ctx.moveTo(far.l + (fw * cc) / 3, far.t); ctx.lineTo(far.l + (fw * cc) / 3, far.b); ctx.stroke(); }
      if (frontDoorClosed) {
        ctx.fillStyle = '#e7b53b';
        ctx.fillRect((far.l + far.r) / 2 - fw * 0.06, (far.t + far.b) / 2, fw * 0.12, fh * 0.12);
      }
      break;
    }
    // markers for special cells ahead
    const fkey = `${fx},${fy}`;
    const gkey = `${map.id}:${fkey}`;
    if (map.portals?.[fkey]) marker(ctx, far, '#4cc9f0');
    else if (map.chests?.[fkey] && !g.lootedChests.includes(gkey)) marker(ctx, far, '#e7b53b');
    else if (map.encounters?.[fkey] && !g.clearedEncounters.includes(gkey)) marker(ctx, far, '#9b2226');
    cx = fx; cy = fy;
  }

  // torch glow vignette
  if (!lit) {
    const vg = ctx.createRadialGradient(CX, CY, 40, CX, CY, CW * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CW, CH);
  }
}

function seam(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, sh: number) {
  ctx.strokeStyle = `rgba(0,0,0,0.22)`;
  ctx.lineWidth = 1;
  // horizontal seams interpolated between near/far edges
  for (let r = 1; r < 4; r++) {
    const ny = y1 + (y4 - y1) * (r / 4);
    const fy = y2 + (y3 - y2) * (r / 4);
    ctx.beginPath(); ctx.moveTo(x1, ny); ctx.lineTo(x2, fy); ctx.stroke();
  }
  void x3; void x4; void sh;
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

// a wall-mounted torch with a warm glow
function torch(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, lit: boolean) {
  const h = 26 * scale, w = 6 * scale;
  // bracket
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - w / 2, y, w, h);
  // glow
  const gr = ctx.createRadialGradient(x, y - 4 * scale, 1, x, y - 4 * scale, 34 * scale);
  gr.addColorStop(0, lit ? 'rgba(255,210,120,0.55)' : 'rgba(255,170,70,0.5)');
  gr.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(x, y - 4 * scale, 34 * scale, 0, Math.PI * 2); ctx.fill();
  // flame
  ctx.fillStyle = '#ffcf66';
  ctx.beginPath(); ctx.moveTo(x, y - 16 * scale); ctx.quadraticCurveTo(x + 5 * scale, y - 6 * scale, x, y); ctx.quadraticCurveTo(x - 5 * scale, y - 6 * scale, x, y - 16 * scale); ctx.fill();
  ctx.fillStyle = '#ff8a3a';
  ctx.beginPath(); ctx.moveTo(x, y - 11 * scale); ctx.quadraticCurveTo(x + 3 * scale, y - 5 * scale, x, y - 1 * scale); ctx.quadraticCurveTo(x - 3 * scale, y - 5 * scale, x, y - 11 * scale); ctx.fill();
}

// ===== Overworld top-down =====
const TERRAIN_COLORS: Record<string, string> = {
  '#': '#2b2540', '.': '#3f6b3f', '~': '#27496d', '^': '#5b5b6b', 'T': '#234d20',
  'S': '#3f6b3f', 'g': '#4a7a3a', 'r': '#8a7a52', 's': '#c2a86a', 'L': '#8a2a14', 'b': '#6b4a2a',
};

export function drawOverworld(ctx: CanvasRenderingContext2D, g: GameState) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const rows = grid.length, cols = grid[0].length;
  const tile = Math.floor(Math.min(CW / cols, CH / rows));
  const ox = Math.floor((CW - tile * cols) / 2);
  const oy = Math.floor((CH - tile * rows) / 2);

  // sky backdrop
  ctx.fillStyle = '#0c0913';
  ctx.fillRect(0, 0, CW, CH);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      ctx.fillStyle = TERRAIN_COLORS[ch] || '#3f6b3f';
      ctx.fillRect(ox + x * tile, oy + y * tile, tile - 1, tile - 1);
      const cxp = ox + x * tile, cyp = oy + y * tile;
      if (ch === 'T') { ctx.fillStyle = '#1b3a18'; ctx.beginPath(); ctx.arc(cxp + tile / 2, cyp + tile / 2, tile * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a2a18'; ctx.fillRect(cxp + tile / 2 - 1, cyp + tile * 0.6, 2, tile * 0.3); }
      else if (ch === '^') { ctx.fillStyle = '#7a7a8c'; ctx.beginPath(); ctx.moveTo(cxp + tile / 2, cyp + tile * 0.18); ctx.lineTo(cxp + tile * 0.85, cyp + tile * 0.85); ctx.lineTo(cxp + tile * 0.15, cyp + tile * 0.85); ctx.fill(); ctx.fillStyle = '#e9edf2'; ctx.beginPath(); ctx.moveTo(cxp + tile / 2, cyp + tile * 0.18); ctx.lineTo(cxp + tile * 0.62, cyp + tile * 0.42); ctx.lineTo(cxp + tile * 0.38, cyp + tile * 0.42); ctx.fill(); }
      else if (ch === '~') { ctx.fillStyle = 'rgba(120,180,220,0.25)'; ctx.fillRect(cxp + 2, cyp + tile * 0.4, tile - 5, 1.5); }
      else if (ch === 'L') { ctx.fillStyle = '#e8902a'; ctx.fillRect(cxp + tile * 0.3, cyp + tile * 0.3, tile * 0.4, tile * 0.4); }
    }
  }
  // portals
  for (const [key, portal] of Object.entries(map.portals || {})) {
    const [px, py] = key.split(',').map(Number);
    const isTown = portal.toScreen === 'town';
    ctx.fillStyle = isTown ? '#e7b53b' : '#9d4edd';
    ctx.fillRect(ox + px * tile + tile * 0.2, oy + py * tile + tile * 0.15, tile * 0.6, tile * 0.7);
    ctx.fillStyle = '#120e1a';
    ctx.fillRect(ox + px * tile + tile * 0.38, oy + py * tile + tile * 0.4, tile * 0.24, tile * 0.45);
    ctx.fillStyle = isTown ? '#fff3c4' : '#d8b4fe';
    ctx.font = `bold ${Math.floor(tile * 0.32)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isTown ? '城' : '窟', ox + px * tile + tile / 2, oy + py * tile + tile * 0.3);
  }
  // encounters
  for (const key of Object.keys(map.encounters || {})) {
    if (g.clearedEncounters.includes(`${map.id}:${key}`)) continue;
    const [px, py] = key.split(',').map(Number);
    ctx.fillStyle = '#9b2226';
    ctx.beginPath(); ctx.arc(ox + px * tile + tile / 2, oy + py * tile + tile / 2, tile * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1; ctx.stroke();
  }
  // party arrow
  const cxp = ox + g.pos.x * tile + tile / 2;
  const cyp = oy + g.pos.y * tile + tile / 2;
  const d = DIRV[g.pos.dir];
  ctx.fillStyle = '#4cc9f0';
  ctx.beginPath();
  ctx.moveTo(cxp + d.x * tile * 0.38, cyp + d.y * tile * 0.38);
  ctx.lineTo(cxp - d.x * tile * 0.3 + d.y * tile * 0.26, cyp - d.y * tile * 0.3 + d.x * tile * 0.26);
  ctx.lineTo(cxp - d.x * tile * 0.3 - d.y * tile * 0.26, cyp - d.y * tile * 0.3 - d.x * tile * 0.26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#0c0913'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'start';
}

// ===== Town scene =====
const TOWN_SCENES: Record<string, { sky: [string, string]; ground: string; accent: string }> = {
  sorpigal: { sky: ['#3a6ea5', '#88b8d8'], ground: '#5a7a4a', accent: '#9aa3ad' },
  fountainhead: { sky: ['#6a9bd0', '#bfe0f0'], ground: '#4a8a5a', accent: '#cfe8f5' },
  wildabar: { sky: ['#caa15a', '#e8c98a'], ground: '#b89a5a', accent: '#9c7a4a' },
};
export function drawTownScene(ctx: CanvasRenderingContext2D, townId: string) {
  const t = TOWN_SCENES[townId] || TOWN_SCENES.sorpigal;
  const sky = ctx.createLinearGradient(0, 0, 0, CH * 0.7);
  sky.addColorStop(0, t.sky[0]); sky.addColorStop(1, t.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
  // sun
  ctx.fillStyle = 'rgba(255,245,200,0.8)'; ctx.beginPath(); ctx.arc(CW * 0.8, CH * 0.22, 26, 0, Math.PI * 2); ctx.fill();
  // distant hills
  ctx.fillStyle = 'rgba(40,60,40,0.45)';
  ctx.beginPath(); ctx.moveTo(0, CH * 0.62);
  for (let x = 0; x <= CW; x += 40) ctx.lineTo(x, CH * 0.62 - Math.sin(x * 0.02) * 18 - 14);
  ctx.lineTo(CW, CH); ctx.lineTo(0, CH); ctx.fill();
  // ground
  ctx.fillStyle = t.ground; ctx.fillRect(0, CH * 0.68, CW, CH * 0.32);
  // city wall + gate
  ctx.fillStyle = t.accent;
  ctx.fillRect(CW * 0.2, CH * 0.42, CW * 0.6, CH * 0.28);
  // battlements
  for (let x = CW * 0.2; x < CW * 0.8; x += 22) { ctx.fillRect(x, CH * 0.38, 12, 10); }
  // towers
  ctx.fillRect(CW * 0.16, CH * 0.34, 26, CH * 0.36);
  ctx.fillRect(CW * 0.78, CH * 0.34, 26, CH * 0.36);
  ctx.fillStyle = '#7a2226';
  ctx.beginPath(); ctx.moveTo(CW * 0.16 - 4, CH * 0.34); ctx.lineTo(CW * 0.16 + 13, CH * 0.26); ctx.lineTo(CW * 0.16 + 30, CH * 0.34); ctx.fill();
  ctx.beginPath(); ctx.moveTo(CW * 0.78 - 4, CH * 0.34); ctx.lineTo(CW * 0.78 + 13, CH * 0.26); ctx.lineTo(CW * 0.78 + 30, CH * 0.34); ctx.fill();
  // gate
  ctx.fillStyle = '#2a1f14';
  ctx.beginPath();
  ctx.moveTo(CW * 0.44, CH * 0.7); ctx.lineTo(CW * 0.44, CH * 0.52);
  ctx.arc(CW * 0.5, CH * 0.52, CW * 0.06, Math.PI, 0); ctx.lineTo(CW * 0.56, CH * 0.7); ctx.fill();
  // gate glow
  ctx.fillStyle = 'rgba(231,181,59,0.25)';
  ctx.fillRect(CW * 0.45, CH * 0.58, CW * 0.1, CH * 0.12);
}

// ===== Combat =====
// fxAlpha (0..1) fades the most recent hit/spell flash for smooth animation.
export function drawCombat(ctx: CanvasRenderingContext2D, g: GameState, fxAlpha = 1) {
  const c = g.combat;
  // biome-tinted backdrop from the current map's sky colour
  const sky = (c && mapMap[c.mapId]?.skyColor) || mapMap[g.pos.mapId]?.skyColor || '#1a0a1e';
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, shade(sky, 1.0));
  grad.addColorStop(1, shade(sky, 0.28));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
  // subtle backdrop particles (embers/dust/bubbles)
  for (let i = 0; i < 22; i++) {
    const px = (i * 137 + 30) % CW, py = (i * 79 + 40) % Math.floor(CH * 0.85);
    ctx.fillStyle = `rgba(255,255,255,${0.04 + (i % 4) * 0.02})`;
    ctx.fillRect(px, py, 2, 2);
  }
  // ground
  ctx.fillStyle = 'rgba(20,16,28,0.55)';
  ctx.beginPath(); ctx.ellipse(CX, CH * 0.82, CW * 0.5, CH * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  if (!c) return;
  const n = c.monsters.length;
  c.monsters.forEach((m, i) => {
    const def = monsterMap[m.defId];
    const cols = Math.min(n, 4);
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    const idxInRow = i % cols;
    const spread = CW / (inRow + 1);
    const mx = spread * (idxInRow + 1);
    const my = CH * 0.4 + row * 84;
    const dead = m.hp <= 0;
    const asleep = !!m.status.asleep;
    ctx.save();
    ctx.globalAlpha = dead ? 0.16 : 1;
    drawMonsterSprite(ctx, def, mx, my, sizeFor(def), dead);
    ctx.restore();
    if (!dead) {
      const sz = sizeFor(def);
      const bw = Math.max(44, sz * 1.6);
      ctx.fillStyle = '#222';
      ctx.fillRect(mx - bw / 2, my - sz - 14, bw, 5);
      ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#3fae5a' : m.hp / m.maxHp > 0.25 ? '#e7b53b' : '#9b2226';
      ctx.fillRect(mx - bw / 2, my - sz - 14, bw * (m.hp / m.maxHp), 5);
      ctx.fillStyle = '#cdbff0';
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(def.name + (asleep ? ' 💤' : ''), mx, my - sz - 18);
    }
  });
  // fx flash (fades via fxAlpha)
  const fx = c.fx;
  if (fx && fxAlpha > 0.02 && fx.targetSide === 'monster') {
    if (fx.targetIdx >= 0) {
      const cols = Math.min(n, 4);
      const row = Math.floor(fx.targetIdx / cols);
      const inRow = Math.min(cols, n - row * cols);
      const idxInRow = fx.targetIdx % cols;
      const spread = CW / (inRow + 1);
      flash(ctx, spread * (idxInRow + 1), CH * 0.4 + row * 84 - (1 - fxAlpha) * 18, fx, fxAlpha);
    } else {
      ctx.save(); ctx.globalAlpha = 0.25 * fxAlpha; ctx.fillStyle = fxColor(fx);
      ctx.fillRect(0, 0, CW, CH); ctx.restore();
    }
  }
  ctx.textAlign = 'start';
}

function sizeFor(def: MonsterDef): number {
  switch (def.size) { case 'huge': return 58; case 'large': return 44; case 'small': return 22; default: return 30; }
}
function fxColor(fx: { element?: string; kind: string }): string {
  if (fx.kind === 'heal') return '#3fae5a';
  switch (fx.element) {
    case 'fire': return '#e8642a'; case 'cold': return '#6ad0e8'; case 'electric': return '#e8e02a';
    case 'holy': return '#ffe08a'; case 'poison': return '#7ec850'; default: return '#c084ff';
  }
}
function flash(ctx: CanvasRenderingContext2D, x: number, y: number, fx: { kind: string; element?: string; amount?: number }, alpha = 1) {
  const col = fx.kind === 'crit' ? '#fff2a0' : fxColor(fx);
  ctx.save();
  ctx.globalAlpha = 0.6 * alpha;
  ctx.fillStyle = col;
  const r = (fx.kind === 'crit' ? 40 : 30) * (0.7 + 0.3 * alpha);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (fx.amount) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fx.kind === 'crit' ? '#fff2a0' : '#fff';
    ctx.font = `bold ${fx.kind === 'crit' ? 20 : 16}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(`-${fx.amount}`, x, y - 28);
    ctx.restore();
  }
}

// ----- monster sprites -----
function drawMonsterSprite(ctx: CanvasRenderingContext2D, def: MonsterDef, x: number, y: number, sz: number, dead: boolean) {
  const c1 = def.color, c2 = def.color2 || shade(def.color, 0.7);
  const eye = '#0b0b12';
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#0b0b12';
  const body = (rx: number, ry: number) => { ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  const eyes = (dx: number, dy: number, r = 3) => { ctx.fillStyle = dead ? '#555' : '#fff'; ctx.beginPath(); ctx.arc(x - dx, y - dy, r, 0, Math.PI * 2); ctx.arc(x + dx, y - dy, r, 0, Math.PI * 2); ctx.fill(); if (!dead) { ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x - dx, y - dy, r * 0.5, 0, Math.PI * 2); ctx.arc(x + dx, y - dy, r * 0.5, 0, Math.PI * 2); ctx.fill(); } };

  switch (def.sprite) {
    case 'rat': body(sz, sz * 0.7); ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(x, y - sz * 0.5, sz * 0.4, sz * 0.4, 0, 0, Math.PI * 2); ctx.fill(); eyes(sz * 0.25, sz * 0.45, 2.5); ctx.strokeStyle = c2; ctx.beginPath(); ctx.moveTo(x + sz, y); ctx.quadraticCurveTo(x + sz * 1.5, y + sz * 0.4, x + sz * 1.3, y + sz); ctx.stroke(); break;
    case 'spider': ctx.strokeStyle = c1; ctx.lineWidth = 2; for (let a = 0; a < 4; a++) { const ang = 0.5 + a * 0.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * sz * 1.5, y + Math.sin(ang) * sz); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * sz * 1.5, y + Math.sin(ang) * sz); ctx.stroke(); } body(sz * 0.8, sz * 0.7); eyes(sz * 0.3, sz * 0.1, 2.5); break;
    case 'wolf': body(sz, sz * 0.7); ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x + sz * 0.7, y - sz * 0.4); ctx.lineTo(x + sz * 1.4, y - sz * 0.2); ctx.lineTo(x + sz * 0.9, y + sz * 0.2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + sz * 1.05, y - sz * 0.25, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x - sz * 0.5, y - sz * 0.6); ctx.lineTo(x - sz * 0.3, y - sz); ctx.lineTo(x - sz * 0.1, y - sz * 0.6); ctx.fill(); break;
    case 'snake': case 'serpent': ctx.strokeStyle = c1; ctx.lineWidth = sz * 0.5; ctx.beginPath(); ctx.moveTo(x - sz, y + sz); ctx.quadraticCurveTo(x + sz, y, x - sz * 0.5, y - sz * 0.5); ctx.quadraticCurveTo(x - sz * 1.2, y - sz, x + sz * 0.3, y - sz * 1.2); ctx.stroke(); ctx.lineWidth = 1.5; ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x + sz * 0.3, y - sz * 1.2, sz * 0.35, 0, Math.PI * 2); ctx.fill(); eyes(sz * 0.12, sz * 1.3, 1.8); break;
    case 'kobold': case 'goblin': case 'orc': case 'bandit': {
      body(sz * 0.8, sz); // body
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - sz * 0.8, sz * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // ears
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x - sz * 0.5, y - sz * 0.9); ctx.lineTo(x - sz * 0.9, y - sz * 1.1); ctx.lineTo(x - sz * 0.4, y - sz * 0.6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sz * 0.5, y - sz * 0.9); ctx.lineTo(x + sz * 0.9, y - sz * 1.1); ctx.lineTo(x + sz * 0.4, y - sz * 0.6); ctx.fill();
      eyes(sz * 0.22, sz * 0.85, 3);
      ctx.strokeStyle = '#0b0b12'; ctx.beginPath(); ctx.moveTo(x - sz * 0.2, y - sz * 0.62); ctx.lineTo(x + sz * 0.2, y - sz * 0.62); ctx.stroke();
      // weapon
      ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + sz * 0.7, y + sz * 0.5); ctx.lineTo(x + sz * 1.1, y - sz * 0.8); ctx.stroke();
      break;
    }
    case 'ogre': case 'cyclops': {
      body(sz * 0.95, sz * 1.05); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - sz * 0.9, sz * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (def.sprite === 'cyclops') { ctx.fillStyle = def.color2 || '#e9c46a'; ctx.beginPath(); ctx.arc(x, y - sz * 0.95, sz * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x, y - sz * 0.95, sz * 0.1, 0, Math.PI * 2); ctx.fill(); }
      else eyes(sz * 0.22, sz * 0.95, 3);
      ctx.fillStyle = '#f0ead6'; ctx.beginPath(); ctx.moveTo(x - sz * 0.2, y - sz * 0.6); ctx.lineTo(x - sz * 0.12, y - sz * 0.4); ctx.lineTo(x - sz * 0.28, y - sz * 0.4); ctx.fill();
      // club
      ctx.fillStyle = '#6b4423'; ctx.fillRect(x + sz * 0.6, y - sz, sz * 0.25, sz * 1.6);
      break;
    }
    case 'skeleton': case 'zombie': case 'ghoul': {
      ctx.fillStyle = c1; ctx.fillRect(x - sz * 0.4, y - sz * 0.4, sz * 0.8, sz * 1.2); // torso
      ctx.beginPath(); ctx.arc(x, y - sz * 0.7, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // skull
      ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(x - sz * 0.2, y - sz * 0.75, sz * 0.13, 0, Math.PI * 2); ctx.arc(x + sz * 0.2, y - sz * 0.75, sz * 0.13, 0, Math.PI * 2); ctx.fill();
      if (def.sprite === 'skeleton') { ctx.strokeStyle = c1; ctx.lineWidth = 2; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(x - sz * 0.4, y - sz * 0.2 + r * sz * 0.35); ctx.lineTo(x + sz * 0.4, y - sz * 0.2 + r * sz * 0.35); ctx.stroke(); } }
      break;
    }
    case 'wraith': {
      ctx.fillStyle = c1; ctx.globalAlpha *= 0.8; ctx.beginPath(); ctx.moveTo(x, y - sz); ctx.quadraticCurveTo(x - sz, y, x - sz * 0.7, y + sz); ctx.lineTo(x - sz * 0.3, y + sz * 0.6); ctx.lineTo(x, y + sz); ctx.lineTo(x + sz * 0.3, y + sz * 0.6); ctx.lineTo(x + sz * 0.7, y + sz); ctx.quadraticCurveTo(x + sz, y, x, y - sz); ctx.fill();
      ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc(x - sz * 0.25, y - sz * 0.3, 3, 0, Math.PI * 2); ctx.arc(x + sz * 0.25, y - sz * 0.3, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'imp': body(sz * 0.7, sz * 0.8); ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x - sz * 0.5, y - sz * 0.7); ctx.lineTo(x - sz * 0.8, y - sz * 1.2); ctx.lineTo(x - sz * 0.2, y - sz * 0.8); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + sz * 0.5, y - sz * 0.7); ctx.lineTo(x + sz * 0.8, y - sz * 1.2); ctx.lineTo(x + sz * 0.2, y - sz * 0.8); ctx.fill(); eyes(sz * 0.22, sz * 0.1, 2.5); break;
    case 'gargoyle': case 'golem': case 'guardian': {
      ctx.fillStyle = c1; ctx.fillRect(x - sz * 0.7, y - sz * 0.8, sz * 1.4, sz * 1.7); ctx.strokeRect(x - sz * 0.7, y - sz * 0.8, sz * 1.4, sz * 1.7);
      ctx.fillStyle = c2; ctx.fillRect(x - sz * 0.5, y - sz, sz, sz * 0.5);
      ctx.fillStyle = def.sprite === 'guardian' ? '#e76f51' : '#e7b53b'; ctx.beginPath(); ctx.arc(x - sz * 0.25, y - sz * 0.75, 3, 0, Math.PI * 2); ctx.arc(x + sz * 0.25, y - sz * 0.75, 3, 0, Math.PI * 2); ctx.fill();
      if (def.sprite === 'gargoyle') { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x - sz * 0.7, y - sz * 0.3); ctx.lineTo(x - sz * 1.4, y - sz * 0.6); ctx.lineTo(x - sz * 0.7, y + sz * 0.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + sz * 0.7, y - sz * 0.3); ctx.lineTo(x + sz * 1.4, y - sz * 0.6); ctx.lineTo(x + sz * 0.7, y + sz * 0.3); ctx.fill(); }
      break;
    }
    case 'wyvern': {
      body(sz * 0.7, sz * 0.9);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x - sz * 0.4, y - sz * 0.3); ctx.lineTo(x - sz * 1.6, y - sz); ctx.lineTo(x - sz * 0.5, y + sz * 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sz * 0.4, y - sz * 0.3); ctx.lineTo(x + sz * 1.6, y - sz); ctx.lineTo(x + sz * 0.5, y + sz * 0.3); ctx.fill();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - sz * 0.8, sz * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      eyes(sz * 0.15, sz * 0.85, 2); break;
    }
    case 'mage': {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, y - sz * 1.3); ctx.lineTo(x - sz * 0.8, y + sz); ctx.lineTo(x + sz * 0.8, y + sz); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6c6a8'; ctx.beginPath(); ctx.arc(x, y - sz * 0.5, sz * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(x, y - sz * 1.5); ctx.lineTo(x - sz * 0.4, y - sz * 0.7); ctx.lineTo(x + sz * 0.4, y - sz * 0.7); ctx.fill();
      ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); ctx.arc(x + sz * 0.7, y - sz * 0.2, sz * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'lich': {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(x, y - sz * 1.4); ctx.lineTo(x - sz, y + sz); ctx.lineTo(x + sz, y + sz); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8d2c0'; ctx.beginPath(); ctx.arc(x, y - sz * 0.6, sz * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.color2 || '#4cc9f0'; ctx.beginPath(); ctx.arc(x - sz * 0.16, y - sz * 0.65, 3, 0, Math.PI * 2); ctx.arc(x + sz * 0.16, y - sz * 0.65, 3, 0, Math.PI * 2); ctx.fill();
      // crown
      ctx.fillStyle = '#e7b53b'; ctx.beginPath(); ctx.moveTo(x - sz * 0.4, y - sz); ctx.lineTo(x - sz * 0.4, y - sz * 1.2); ctx.lineTo(x - sz * 0.13, y - sz); ctx.lineTo(x, y - sz * 1.25); ctx.lineTo(x + sz * 0.13, y - sz); ctx.lineTo(x + sz * 0.4, y - sz * 1.2); ctx.lineTo(x + sz * 0.4, y - sz); ctx.fill();
      // staff
      ctx.strokeStyle = '#5a189a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + sz * 0.8, y - sz); ctx.lineTo(x + sz * 0.8, y + sz); ctx.stroke();
      ctx.fillStyle = '#9d4edd'; ctx.beginPath(); ctx.arc(x + sz * 0.8, y - sz * 1.1, sz * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'harpy': {
      // winged bird-woman
      ctx.fillStyle = c2 || c1;
      ctx.beginPath(); ctx.moveTo(x - sz * 0.3, y - sz * 0.2); ctx.lineTo(x - sz * 1.5, y - sz * 0.8); ctx.lineTo(x - sz * 1.3, y + sz * 0.2); ctx.lineTo(x - sz * 0.3, y + sz * 0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sz * 0.3, y - sz * 0.2); ctx.lineTo(x + sz * 1.5, y - sz * 0.8); ctx.lineTo(x + sz * 1.3, y + sz * 0.2); ctx.lineTo(x + sz * 0.3, y + sz * 0.3); ctx.fill();
      body(sz * 0.45, sz * 0.85);
      ctx.fillStyle = '#e6c6a8'; ctx.beginPath(); ctx.arc(x, y - sz * 0.7, sz * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      eyes(sz * 0.13, sz * 0.72, 2.2);
      ctx.fillStyle = '#e8b84a'; ctx.beginPath(); ctx.moveTo(x, y - sz * 0.6); ctx.lineTo(x + sz * 0.18, y - sz * 0.5); ctx.lineTo(x, y - sz * 0.42); ctx.fill();
      break;
    }
    case 'troll': {
      body(sz * 0.95, sz * 1.1); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - sz * 0.85, sz * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      eyes(sz * 0.2, sz * 0.85, 2.6);
      // big lower jaw + tusks
      ctx.fillStyle = c2 || c1; ctx.fillRect(x - sz * 0.3, y - sz * 0.6, sz * 0.6, sz * 0.2);
      ctx.fillStyle = '#f0ead6'; ctx.beginPath(); ctx.moveTo(x - sz * 0.22, y - sz * 0.42); ctx.lineTo(x - sz * 0.16, y - sz * 0.62); ctx.lineTo(x - sz * 0.1, y - sz * 0.42); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sz * 0.22, y - sz * 0.42); ctx.lineTo(x + sz * 0.16, y - sz * 0.62); ctx.lineTo(x + sz * 0.1, y - sz * 0.42); ctx.fill();
      // long arms + claws
      ctx.strokeStyle = c1; ctx.lineWidth = sz * 0.28; ctx.beginPath(); ctx.moveTo(x - sz * 0.7, y - sz * 0.1); ctx.lineTo(x - sz * 0.95, y + sz); ctx.moveTo(x + sz * 0.7, y - sz * 0.1); ctx.lineTo(x + sz * 0.95, y + sz); ctx.stroke();
      break;
    }
    case 'dragon': {
      // wings
      ctx.fillStyle = c2 || shade(c1, 0.7);
      ctx.beginPath(); ctx.moveTo(x - sz * 0.2, y - sz * 0.4); ctx.lineTo(x - sz * 1.7, y - sz * 1.1); ctx.lineTo(x - sz * 1.5, y + sz * 0.1); ctx.lineTo(x - sz * 0.3, y + sz * 0.2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + sz * 0.2, y - sz * 0.4); ctx.lineTo(x + sz * 1.7, y - sz * 1.1); ctx.lineTo(x + sz * 1.5, y + sz * 0.1); ctx.lineTo(x + sz * 0.3, y + sz * 0.2); ctx.fill();
      body(sz * 0.6, sz * 0.9);
      // neck + head
      ctx.strokeStyle = c1; ctx.lineWidth = sz * 0.4; ctx.beginPath(); ctx.moveTo(x, y - sz * 0.5); ctx.quadraticCurveTo(x + sz * 0.5, y - sz * 1.2, x + sz * 0.9, y - sz * 1.1); ctx.stroke();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x + sz * 1.0, y - sz * 1.05, sz * 0.35, sz * 0.25, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x + sz * 0.95, y - sz * 1.12, 2.4, 0, Math.PI * 2); ctx.fill();
      // horns
      ctx.fillStyle = '#e9e2d0'; ctx.beginPath(); ctx.moveTo(x + sz * 1.1, y - sz * 1.25); ctx.lineTo(x + sz * 1.25, y - sz * 1.5); ctx.lineTo(x + sz * 1.2, y - sz * 1.2); ctx.fill();
      break;
    }
    case 'kraken': {
      // bulbous head
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y - sz * 0.4, sz * 0.85, sz * 1.0, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // tentacles
      ctx.strokeStyle = c1; ctx.lineWidth = sz * 0.22; ctx.lineCap = 'round';
      for (let t = -3; t <= 3; t++) {
        if (t === 0) continue;
        const bx = x + t * sz * 0.22;
        ctx.beginPath(); ctx.moveTo(bx, y + sz * 0.4);
        ctx.quadraticCurveTo(bx + t * sz * 0.3, y + sz * 1.0, bx + t * sz * 0.55, y + sz * 1.5);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // glowing eyes
      ctx.fillStyle = c2 || '#7c5cff'; ctx.beginPath(); ctx.arc(x - sz * 0.3, y - sz * 0.5, sz * 0.16, 0, Math.PI * 2); ctx.arc(x + sz * 0.3, y - sz * 0.5, sz * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0b12'; ctx.beginPath(); ctx.arc(x - sz * 0.3, y - sz * 0.5, sz * 0.06, 0, Math.PI * 2); ctx.arc(x + sz * 0.3, y - sz * 0.5, sz * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: body(sz * 0.8, sz); eyes(sz * 0.25, sz * 0.2, 3); break;
  }
}

// ===== Title =====
export function drawTitle(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, '#1a1330');
  grad.addColorStop(1, '#06060c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
  // stars
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97) % CW, sy = (i * 53) % (CH * 0.6);
    ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.12})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  // mountains
  ctx.fillStyle = '#15101f';
  ctx.beginPath(); ctx.moveTo(0, CH);
  for (let x = 0; x <= CW; x += 40) ctx.lineTo(x, CH * 0.7 - Math.sin(x * 0.015) * 40);
  ctx.lineTo(CW, CH); ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e7b53b';
  ctx.font = 'bold 38px serif';
  ctx.fillText('MIGHT & MAGIC III', CX, CY - 26);
  ctx.fillStyle = '#7c5cff';
  ctx.font = '20px serif';
  ctx.fillText('— Isles of Terra —', CX, CY + 6);
  ctx.fillStyle = '#9a93b3';
  ctx.font = '13px monospace';
  ctx.fillText('A standalone tribute', CX, CY + 38);
  ctx.textAlign = 'start';
}

// ----- color helper -----
function shade(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * f));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * f));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * f));
  return `rgb(${r},${g},${b})`;
}
