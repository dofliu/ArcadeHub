// ===== All canvas rendering =====
import { GameState } from './types';
import { mapMap, monsterMap } from './data/content';
import { MONSTER_SPRITES, DETAILED_SPRITES, drawSprite, drawSilhouette, charSpriteRows, EGA } from './sprites';

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

// ---- original procedural VGA stone/brick helpers (no copied assets) ----
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// Per-dungeon stone tint so each location reads differently.
let THEME = { r: 1, g: 1, b: 1 };
const THEMES: Record<string, { r: number; g: number; b: number }> = {
  warm: { r: 1, g: 1, b: 1 },                 // Middlegate dungeon — tan/brown
  cold: { r: 0.66, g: 0.92, b: 1.7 },          // Sunken caverns — blue/teal
  sky: { r: 0.82, g: 0.96, b: 1.5 },           // Sky temple — pale cold blue
};
function themeFor(mapId: string): { r: number; g: number; b: number } {
  if (mapId.startsWith('caverns')) return THEMES.cold;
  if (mapId.startsWith('sky')) return THEMES.sky;
  return THEMES.warm;
}

// Warm stone colour at brightness level 0..1, tinted by the current theme.
function stoneC(level: number) {
  const L = Math.max(0, Math.min(1, level));
  const r = (34 + L * 168) * THEME.r;
  const g = (28 + L * 132) * THEME.g;
  const b = (20 + L * 92) * THEME.b;
  return `rgb(${Math.min(255, Math.round(r))},${Math.min(255, Math.round(g))},${Math.min(255, Math.round(b))})`;
}

// Beveled brick panel facing the viewer (the showpiece wall).
function brickPanel(ctx: CanvasRenderingContext2D, l: number, t: number, r: number, b: number, level: number) {
  const w = r - l, h = b - t;
  if (w < 2 || h < 2) return;
  ctx.fillStyle = stoneC(level - 0.42); // mortar
  ctx.fillRect(l, t, w, h);
  const bh = Math.max(7, h / 7);
  const bw = Math.max(16, w / 4);
  const gap = Math.max(1, Math.round(bh * 0.16));
  let row = 0;
  for (let y = t; y < b - 1; y += bh) {
    const off = (row % 2) * (bw / 2);
    for (let x = l - off; x < r - 1; x += bw) {
      const bx = Math.max(l, x), by = Math.max(t, y);
      const bxw = Math.min(r, x + bw - gap) - bx;
      const bhh = Math.min(b, y + bh - gap) - by;
      if (bxw <= 1 || bhh <= 1) continue;
      ctx.fillStyle = stoneC(level + (Math.random() < 0.5 ? 0 : 0.04));
      ctx.fillRect(bx, by, bxw, bhh);
      ctx.fillStyle = stoneC(level + 0.2);             // top-left highlight
      ctx.fillRect(bx, by, bxw, 1); ctx.fillRect(bx, by, 1, bhh);
      ctx.fillStyle = stoneC(level - 0.26);            // bottom-right shadow
      ctx.fillRect(bx, by + bhh - 1, bxw, 1); ctx.fillRect(bx + bxw - 1, by, 1, bhh);
    }
    row++;
  }
}

// Receding side wall (trapezoid): fill + depth gradient + brick courses/joints.
function sideWall(ctx: CanvasRenderingContext2D, nx: number, fx: number, near: { t: number; b: number }, far: { t: number; b: number }, level: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(nx, near.t); ctx.lineTo(fx, far.t); ctx.lineTo(fx, far.b); ctx.lineTo(nx, near.b); ctx.closePath();
  ctx.clip();
  const x0 = Math.min(nx, fx), x1 = Math.max(nx, fx);
  ctx.fillStyle = stoneC(level - 0.08);
  ctx.fillRect(x0, 0, x1 - x0, CH);
  const grad = ctx.createLinearGradient(nx, 0, fx, 0);
  grad.addColorStop(0, 'rgba(255,235,200,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = grad; ctx.fillRect(x0, 0, x1 - x0, CH);
  ctx.strokeStyle = stoneC(level - 0.4); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 6; i++) { const f = i / 6; ctx.moveTo(nx, lerp(near.t, near.b, f)); ctx.lineTo(fx, lerp(far.t, far.b, f)); }
  for (let j = 1; j <= 4; j++) { const f = j / 5; const x = lerp(nx, fx, f); ctx.moveTo(x, lerp(near.t, far.t, f)); ctx.lineTo(x, lerp(near.b, far.b, f)); }
  ctx.stroke();
  ctx.restore();
}

// MM2-style bright frame around the viewport.
function viewFrame(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, CW - 6, CH - 6);
  ctx.strokeStyle = '#1d6e8c'; ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, CW - 14, CH - 14);
}

// Soft darkening toward the edges.
function vignette(ctx: CanvasRenderingContext2D, strength = 0.5) {
  const grad = ctx.createRadialGradient(CX, CY * 1.05, CH * 0.25, CX, CY, CH * 0.78);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);
}

// A wall torch with a warm additive glow that flickers over time.
function torch(ctx: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  const t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const flick = 0.82 + 0.13 * Math.sin(t / 95 + x * 0.05) + 0.07 * Math.sin(t / 31 + y);
  const R = 60 * s * flick;
  // glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 2, x, y, R);
  gr.addColorStop(0, `rgba(255,180,70,${0.5 * flick})`);
  gr.addColorStop(0.5, 'rgba(255,120,30,0.16)');
  gr.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // bracket + flame
  const fh = 8 * s * flick;
  ctx.fillStyle = '#3a2a18'; ctx.fillRect(x - 2 * s, y, 4 * s, 16 * s);
  ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 4 * s, fh, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff7b1a'; ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 2.5 * s, fh * 0.62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 1.4 * s, fh * 0.38, 0, 0, Math.PI * 2); ctx.fill();
}

// Draw a monster sprite with a 1px dark outline for a cleaner, designed look.
function outlinedSprite(ctx: CanvasRenderingContext2D, rows: string[], cx: number, baseY: number, px: number) {
  const o = '#0a0810';
  drawSilhouette(ctx, rows, cx - px, baseY, px, o);
  drawSilhouette(ctx, rows, cx + px, baseY, px, o);
  drawSilhouette(ctx, rows, cx, baseY - px, px, o);
  drawSilhouette(ctx, rows, cx, baseY + px, px, o);
  drawSprite(ctx, rows, cx, baseY, px);
}

export function drawDungeon(ctx: CanvasRenderingContext2D, g: GameState, vga = true) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  THEME = themeFor(map.id);
  const lit = !!g.flags['light'];
  const amb = lit ? 0.95 : 0.6; // ambient brightness

  // ceiling + floor base
  ctx.fillStyle = stoneC(0.1 * amb); ctx.fillRect(0, 0, CW, CY);
  ctx.fillStyle = stoneC(0.34 * amb); ctx.fillRect(0, CY, CW, CH - CY);
  // perspective-tiled floor & ceiling (alternating courses, full width; walls drawn over)
  const op: ReturnType<typeof opening>[] = [];
  for (let d = 0; d <= 5; d++) op.push(opening(d));
  for (let d = 0; d < 5; d++) {
    const fNear = op[d].b, fFar = op[d + 1].b;
    if (fNear > fFar) { ctx.fillStyle = stoneC((0.46 - d * 0.06 + (d % 2) * 0.07) * amb); ctx.fillRect(0, fFar, CW, fNear - fFar); }
    const cNear = op[d].t, cFar = op[d + 1].t;
    if (cFar > cNear) { ctx.fillStyle = stoneC((0.13 + (d % 2) * 0.05) * amb); ctx.fillRect(0, cNear, CW, cFar - cNear); }
  }
  // faint converging guide lines
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const x of [CW * 0.12, CW * 0.32, CW * 0.68, CW * 0.88]) { ctx.moveTo(x, CH); ctx.lineTo(CX, CY); ctx.moveTo(x, 0); ctx.lineTo(CX, CY); }
  ctx.stroke();

  const fwd = DIRV[g.pos.dir];
  const left = DIRV[(g.pos.dir + 3) % 4];
  const right = DIRV[(g.pos.dir + 1) % 4];
  let cx = g.pos.x, cy = g.pos.y;
  const maxDepth = 4;

  for (let s = 0; s <= maxDepth; s++) {
    const near = opening(s), far = opening(s + 1);
    const sideLevel = Math.max(0.12, (lit ? 0.72 : 0.5) - s * 0.13);
    const frontLevel = Math.max(0.16, (lit ? 0.86 : 0.62) - s * 0.14);

    if (isSolid(grid, cx + left.x, cy + left.y) || isDoorClosed(g, cx + left.x, cy + left.y)) {
      sideWall(ctx, near.l, far.l, { t: near.t, b: near.b }, { t: far.t, b: far.b }, sideLevel);
    }
    if (isSolid(grid, cx + right.x, cy + right.y) || isDoorClosed(g, cx + right.x, cy + right.y)) {
      sideWall(ctx, near.r, far.r, { t: near.t, b: near.b }, { t: far.t, b: far.b }, sideLevel);
    }
    const fx = cx + fwd.x, fy = cy + fwd.y;
    const frontDoorClosed = isDoorClosed(g, fx, fy);
    if (isSolid(grid, fx, fy)) {
      brickPanel(ctx, far.l, far.t, far.r, far.b, frontLevel);
      break;
    }
    if (frontDoorClosed) {
      brickPanel(ctx, far.l, far.t, far.r, far.b, frontLevel);
      const dw = far.r - far.l, dh = far.b - far.t;
      ctx.fillStyle = '#241a3a'; ctx.fillRect(far.l + dw * 0.2, far.t + dh * 0.12, dw * 0.6, dh * 0.88);
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2; ctx.strokeRect(far.l + dw * 0.2, far.t + dh * 0.12, dw * 0.6, dh * 0.88);
      ctx.fillStyle = '#e7b53b';
      ctx.fillRect(far.l + dw * 0.55, far.t + dh * 0.5, dw * 0.06, dh * 0.12);
      break;
    }
    const fkey = `${fx},${fy}`;
    const gkey = `${map.id}:${fkey}`;
    if (map.portals?.[fkey]) marker(ctx, far, '#4cc9f0');
    else if (map.chests?.[fkey] && !g.lootedChests.includes(gkey)) marker(ctx, far, '#e7b53b');
    else if (map.encounters?.[fkey] && !g.clearedEncounters.includes(gkey)) marker(ctx, far, '#9b2226');
    cx = fx; cy = fy;
  }
  // wall torches on the nearest solid side walls
  const nearL = isSolid(grid, g.pos.x + left.x, g.pos.y + left.y);
  const nearR = isSolid(grid, g.pos.x + right.x, g.pos.y + right.y);
  if (lit || nearL) { if (nearL) torch(ctx, CW * 0.05, CH * 0.42, 1); }
  if (lit || nearR) { if (nearR) torch(ctx, CW * 0.95, CH * 0.42, 1); }
  vignette(ctx, lit ? 0.32 : 0.55);
  if (!vga) egaPost(ctx);
  viewFrame(ctx);
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

export function drawOverworld(ctx: CanvasRenderingContext2D, g: GameState, vga = true) {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const rows = grid.length, cols = grid[0].length;
  const tile = Math.floor(Math.min(CW / cols, CH / rows));
  const ox = Math.floor((CW - tile * cols) / 2);
  const oy = Math.floor((CH - tile * rows) / 2);

  ctx.fillStyle = '#0b0a14'; ctx.fillRect(0, 0, CW, CH);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      const tx = ox + x * tile, ty = oy + y * tile, T = tile;
      if (ch === '#') {
        ctx.fillStyle = '#241f33'; ctx.fillRect(tx, ty, T, T);
      } else if (ch === '~') {
        ctx.fillStyle = '#1f5a86'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#3a83b8';
        ctx.fillRect(tx + T * 0.12, ty + T * 0.3, T * 0.45, 2);
        ctx.fillRect(tx + T * 0.45, ty + T * 0.6, T * 0.45, 2);
      } else {
        // grass base everywhere (under trees/mountains too)
        ctx.fillStyle = '#3a6b3a'; ctx.fillRect(tx, ty, T, T);
        ctx.fillStyle = '#447a44';
        if ((x + y) % 2 === 0) ctx.fillRect(tx + T * 0.2, ty + T * 0.5, 3, 3);
        ctx.fillStyle = '#2e5730';
        if ((x * 2 + y) % 3 === 0) ctx.fillRect(tx + T * 0.6, ty + T * 0.25, 3, 3);
        if (ch === 'T') {
          ctx.fillStyle = '#5a3a1c'; ctx.fillRect(tx + T * 0.44, ty + T * 0.55, T * 0.12, T * 0.35);
          ctx.fillStyle = '#1f5224'; ctx.beginPath(); ctx.arc(tx + T / 2, ty + T * 0.42, T * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2f7a36'; ctx.beginPath(); ctx.arc(tx + T * 0.42, ty + T * 0.36, T * 0.16, 0, Math.PI * 2); ctx.fill();
        }
        if (ch === '^') {
          ctx.fillStyle = '#6c6c7e'; ctx.beginPath(); ctx.moveTo(tx + T / 2, ty + T * 0.12); ctx.lineTo(tx + T * 0.9, ty + T * 0.9); ctx.lineTo(tx + T * 0.1, ty + T * 0.9); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#4a4a5a'; ctx.beginPath(); ctx.moveTo(tx + T / 2, ty + T * 0.12); ctx.lineTo(tx + T * 0.5, ty + T * 0.9); ctx.lineTo(tx + T * 0.1, ty + T * 0.9); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#eef2f6'; ctx.beginPath(); ctx.moveTo(tx + T / 2, ty + T * 0.12); ctx.lineTo(tx + T * 0.64, ty + T * 0.4); ctx.lineTo(tx + T * 0.36, ty + T * 0.4); ctx.closePath(); ctx.fill();
        }
      }
    }
  }
  // portals: towns as buildings, dungeons as cave mouths
  for (const [key, portal] of Object.entries(map.portals || {})) {
    const [px, py] = key.split(',').map(Number);
    const tx = ox + px * tile, ty = oy + py * tile, T = tile;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(tx + T / 2, ty + T * 0.86, T * 0.32, T * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    if (portal.toScreen === 'town') {
      ctx.fillStyle = '#caa45a'; ctx.fillRect(tx + T * 0.2, ty + T * 0.45, T * 0.6, T * 0.4); // wall
      ctx.fillStyle = '#9b2226'; ctx.beginPath(); ctx.moveTo(tx + T * 0.12, ty + T * 0.45); ctx.lineTo(tx + T / 2, ty + T * 0.18); ctx.lineTo(tx + T * 0.88, ty + T * 0.45); ctx.closePath(); ctx.fill(); // roof
      ctx.fillStyle = '#3a2410'; ctx.fillRect(tx + T * 0.42, ty + T * 0.6, T * 0.16, T * 0.25); // door
    } else {
      ctx.fillStyle = '#3a3344'; ctx.fillRect(tx + T * 0.18, ty + T * 0.3, T * 0.64, T * 0.55);
      ctx.fillStyle = '#0a0810'; ctx.beginPath(); ctx.arc(tx + T / 2, ty + T * 0.62, T * 0.26, Math.PI, 0); ctx.fill(); ctx.fillRect(tx + T * 0.24, ty + T * 0.62, T * 0.52, T * 0.24);
    }
  }
  // encounters
  for (const key of Object.keys(map.encounters || {})) {
    if (g.clearedEncounters.includes(`${map.id}:${key}`)) continue;
    const [px, py] = key.split(',').map(Number);
    ctx.fillStyle = '#9b2226';
    ctx.beginPath(); ctx.arc(ox + px * tile + tile / 2, oy + py * tile + tile / 2, tile * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  // party — the leader's figure stands on the tile
  const cxp = ox + g.pos.x * tile + tile / 2;
  const cyp = oy + g.pos.y * tile + tile / 2;
  const d = DIRV[g.pos.dir];
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(cxp, cyp + tile * 0.42, tile * 0.3, tile * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  const leader = g.party[0];
  if (leader) {
    const lp = Math.max(1, Math.round(tile / 11));
    drawSprite(ctx, charSpriteRows(leader.classId, { raceId: leader.raceId, weaponId: leader.equipment.weapon, armorId: leader.equipment.armor }), cxp, cyp + tile * 0.48, lp);
  }
  ctx.fillStyle = '#4cc9f0';
  ctx.beginPath(); ctx.arc(cxp + d.x * tile * 0.42, cyp + d.y * tile * 0.42, tile * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'start';
  if (!vga) egaPost(ctx);
  viewFrame(ctx);
}

export function drawCombat(ctx: CanvasRenderingContext2D, g: GameState, vga = true, fx: ActiveFx[] = []) {
  THEME = themeFor(g.pos.mapId);
  // textured stone chamber: brick back wall + side walls + tiled floor
  const floorY = CH * 0.62;
  brickPanel(ctx, 0, 0, CW, floorY, 0.6);                 // back wall
  sideWall(ctx, 0, CW * 0.16, { t: 0, b: floorY }, { t: floorY * 0.18, b: floorY * 0.9 }, 0.5);          // left wall
  sideWall(ctx, CW, CW * 0.84, { t: 0, b: floorY }, { t: floorY * 0.18, b: floorY * 0.9 }, 0.5);          // right wall
  // floor: alternating perspective bands
  for (let i = 0; i < 6; i++) {
    const y0 = floorY + ((CH - floorY) * i) / 6;
    const y1 = floorY + ((CH - floorY) * (i + 1)) / 6;
    ctx.fillStyle = stoneC(0.3 + (i % 2) * 0.08 + i * 0.02);
    ctx.fillRect(0, y0, CW, y1 - y0);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const x of [CW * 0.1, CW * 0.3, CW * 0.7, CW * 0.9]) { ctx.moveTo(x, CH); ctx.lineTo(CX, floorY); }
  ctx.stroke();
  torch(ctx, CW * 0.11, floorY * 0.42, 1.1);
  torch(ctx, CW * 0.89, floorY * 0.42, 1.1);
  const c = g.combat;
  if (!c) { vignette(ctx, 0.45); if (!vga) egaPost(ctx); viewFrame(ctx); return; }
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
    const sprite = DETAILED_SPRITES[m.defId] || MONSTER_SPRITES[m.defId];
    const size = def.boss ? 60 : 26;
    // reaction to an active hit/spell effect on this monster
    const hitFx = fx.find(e => e.side === 'monster' && e.idx === i && (e.kind === 'hit' || e.kind === 'crit' || e.kind === 'spell'));
    const react = hitFx ? Math.max(0, 1 - hitFx.age) : 0;
    const jitter = react > 0 ? Math.round(Math.sin(hitFx!.age * 30) * 3 * react) : 0;
    if (sprite) {
      const px = Math.max(3, Math.round((def.boss ? 150 : 96) / sprite[0].length));
      const mxj = mx + jitter;
      const baseY = my + (def.boss ? 70 : 46);
      // ground shadow
      ctx.save();
      ctx.globalAlpha = (dead ? 0.1 : 0.35);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(mx, baseY, (sprite[0].length * px) * 0.4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = dead ? 0.2 : 1;
      outlinedSprite(ctx, sprite, mxj, baseY, px);
      if (react > 0.05) {
        ctx.save();
        ctx.globalAlpha = react * 0.8;
        drawSilhouette(ctx, sprite, mxj, baseY, px, hitFx!.kind === 'crit' ? '#fff7c0' : '#ffffff');
        ctx.restore();
      }
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
  vignette(ctx, 0.42);
  ctx.fillStyle = '#4cc9f0';
  ctx.font = '13px monospace';
  ctx.fillText(`ROUND ${c.round}`, 12, 22);
  if (!vga) egaPost(ctx);
  viewFrame(ctx);
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
