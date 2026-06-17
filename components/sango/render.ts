import { BattleState, City, GameState } from './types';

// ===========================================================================
// Canvas rendering for the strategic map and the tactical battlefield.
// Pure drawing; click hit-testing helpers are exported alongside.
// ===========================================================================

export const MAP_W = 860;
export const MAP_H = 560;
export const CELL = 46;

const UNIT_LABEL: Record<string, string> = { infantry: '步', cavalry: '騎', archer: '弓' };

function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = `bold ${size}px "Noto Sans TC", sans-serif`;
  ctx.textAlign = align;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ---- Strategic map --------------------------------------------------------

export interface MapView {
  selected: string | null;
  targets: string[];   // attackable neighbour city ids to highlight
  hover: string | null;
}

export function drawMap(ctx: CanvasRenderingContext2D, s: GameState, view: MapView) {
  // Land / sea backdrop.
  ctx.fillStyle = '#21344a';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.fillStyle = '#caa86a';
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.bezierCurveTo(120, 160, 60, 320, 180, 560);
  ctx.lineTo(MAP_W, 560);
  ctx.bezierCurveTo(MAP_W - 60, 380, MAP_W - 40, 150, MAP_W - 140, 0);
  ctx.closePath();
  ctx.fill();
  // Texture: lighter plains.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 137) % MAP_W, (i * 89) % MAP_H, 26, 8);
  // Rivers (黃河 / 長江).
  ctx.strokeStyle = '#3f7fb8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(150, 250); ctx.bezierCurveTo(350, 230, 560, 300, 800, 280); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(240, 470); ctx.bezierCurveTo(420, 500, 620, 470, 800, 500); ctx.stroke();

  // Roads between adjacent cities.
  ctx.strokeStyle = 'rgba(40,25,10,0.5)'; ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  const seen = new Set<string>();
  for (const c of Object.values(s.cities)) {
    for (const nid of c.neighbors) {
      const key = [c.id, nid].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const n = s.cities[nid];
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // City nodes.
  for (const c of Object.values(s.cities)) {
    const fac = c.faction ? s.factions[c.faction] : null;
    const color = fac ? fac.color : '#888';
    const isPlayer = c.faction === s.playerFaction;
    const r = 16 + Math.min(14, c.troops / 2000);

    if (view.selected === c.id) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(c.x, c.y, r + 8, 0, Math.PI * 2); ctx.fill();
    }
    if (view.targets.includes(c.id)) {
      ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, c.y, r + 6, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = isPlayer ? 4 : 2;
    ctx.strokeStyle = isPlayer ? '#ffe14a' : 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();

    text(ctx, c.name, c.x, c.y - r - 6, 16, '#fff');
    text(ctx, `${(c.troops / 1000).toFixed(1)}k`, c.x, c.y + 4, 12, '#fff');
  }
}

export function mapCityAt(s: GameState, mx: number, my: number): string | null {
  for (const c of Object.values(s.cities)) {
    const r = 18 + Math.min(14, c.troops / 2000);
    if ((mx - c.x) ** 2 + (my - c.y) ** 2 <= r * r) return c.id;
  }
  return null;
}

// ---- Tactical battlefield -------------------------------------------------

const TERRAIN_COLOR: Record<string, string> = {
  plain: '#6f9e54', forest: '#2f6b3a', mountain: '#8a7a5a',
  water: '#3a72b0', wall: '#5e5e69', gate: '#9a7b4a', castle: '#b9933a',
};

export function drawBattle(ctx: CanvasRenderingContext2D, s: GameState, bs: BattleState) {
  const ox = 0, oy = 0;
  // Tiles.
  for (let y = 0; y < bs.h; y++) {
    for (let x = 0; x < bs.w; x++) {
      const t = bs.tiles[y][x];
      ctx.fillStyle = TERRAIN_COLOR[t];
      ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
      if (t === 'forest') { ctx.fillStyle = '#1f4a28'; ctx.beginPath(); ctx.arc(ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2, CELL * 0.28, 0, Math.PI * 2); ctx.fill(); }
      if (t === 'mountain') { ctx.fillStyle = '#6b5e44'; ctx.beginPath(); ctx.moveTo(ox + x * CELL + 6, oy + y * CELL + CELL - 8); ctx.lineTo(ox + x * CELL + CELL / 2, oy + y * CELL + 8); ctx.lineTo(ox + x * CELL + CELL - 6, oy + y * CELL + CELL - 8); ctx.closePath(); ctx.fill(); }
      if (t === 'castle') { ctx.fillStyle = '#7a5a1a'; ctx.fillRect(ox + x * CELL + 8, oy + y * CELL + 8, CELL - 16, CELL - 16); text(ctx, '城', ox + x * CELL + CELL / 2, oy + y * CELL + CELL / 2 + 6, 16, '#ffe14a'); }
      if (t === 'gate') { ctx.fillStyle = '#6b4a1a'; ctx.fillRect(ox + x * CELL + CELL / 2 - 6, oy + y * CELL + 6, 12, CELL - 12); }
    }
  }

  // Reachable highlights.
  ctx.fillStyle = 'rgba(80,180,255,0.35)';
  for (const t of bs.reachable) ctx.fillRect(ox + t.x * CELL, oy + t.y * CELL, CELL, CELL);

  // Units.
  bs.units.forEach((u, i) => {
    if (u.hp <= 0) return;
    const px = ox + u.x * CELL, py = oy + u.y * CELL;
    const fac = u.side === 'atk' ? s.factions[bs.attacker] : s.factions[bs.defender];
    const o = s.officers[u.officerId];
    if (bs.selected === i) {
      ctx.fillStyle = 'rgba(255,255,80,0.4)';
      ctx.fillRect(px, py, CELL, CELL);
    }
    // Token.
    ctx.fillStyle = fac.color;
    roundRect(ctx, px + 4, py + 4, CELL - 8, CELL - 14, 6); ctx.fill();
    ctx.strokeStyle = u.side === 'atk' ? '#ffffff' : '#101010'; ctx.lineWidth = 2;
    roundRect(ctx, px + 4, py + 4, CELL - 8, CELL - 14, 6); ctx.stroke();
    // Type badge + name.
    text(ctx, UNIT_LABEL[u.type], px + CELL - 12, py + 16, 11, '#ffe14a');
    text(ctx, o.name, px + CELL / 2, py + CELL / 2, 13, '#fff');
    // HP bar.
    const hpw = (CELL - 8) * (u.hp / u.maxHp);
    ctx.fillStyle = '#000'; ctx.fillRect(px + 4, py + CELL - 8, CELL - 8, 5);
    ctx.fillStyle = u.hp / u.maxHp > 0.4 ? '#4ade80' : '#ef4444';
    ctx.fillRect(px + 4, py + CELL - 8, hpw, 5);
    // Morale pip / fire.
    if (u.morale < 35) { ctx.fillStyle = '#ff5cf0'; ctx.fillRect(px + 4, py + 4, 5, 5); }
    if (u.fire > 0) { text(ctx, '火', px + 12, py + 16, 12, '#ff7a2c'); }
  });

  // Animation overlay.
  if (bs.anim) {
    const a = bs.anim;
    const px = ox + a.x * CELL + CELL / 2, py = oy + a.y * CELL + CELL / 2;
    if (a.kind === 'fire') {
      ctx.globalAlpha = Math.min(1, a.timer / 22);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = ['#ff7a2c', '#ffd24a', '#ff3c1f'][i % 3];
        const ang = i / 8 * Math.PI * 2 + a.timer * 0.2;
        ctx.beginPath(); ctx.arc(px + Math.cos(ang) * 14, py + Math.sin(ang) * 14, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (a.kind === 'attack') {
      ctx.globalAlpha = Math.min(1, a.timer / 16);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px, py, 6 + i * 7 + (16 - a.timer), 0, Math.PI * 2); ctx.stroke(); }
      if (a.text) text(ctx, a.text, px, py - 16, 18, '#ff5a3c');
      ctx.globalAlpha = 1;
    }
  }
}

export function battleCellAt(mx: number, my: number): { x: number; y: number } {
  return { x: Math.floor(mx / CELL), y: Math.floor(my / CELL) };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
