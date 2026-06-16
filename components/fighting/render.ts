import { GameState, Fighter, WORLD_W, WORLD_H, GROUND_Y } from './engine';
import { POSES } from './poses';
import { Pose } from './types';

// ===========================================================================
// Canvas renderer for the fighting game. Pure drawing: it never mutates state.
// Fighters are drawn procedurally from the pose skeletons (no image assets),
// in the spirit of the project's other hand-drawn sprite work.
// ===========================================================================

// Moves animated as kicks (used for motion-smear placement).
const KICK_MOVES = new Set(['lk', 'hk', 'clk', 'chk', 'jk', 'spinkick']);

// Smoothed virtual camera. Lives at module scope because a single match is on
// screen at a time; resetCamera() snaps it when a new match starts.
const cam = { cx: WORLD_W / 2, cy: WORLD_H / 2, zoom: 1, init: false };
export function resetCamera() { cam.init = false; }

function updateCamera(a: Fighter, b: Fighter) {
  const spread = Math.abs(a.x - b.x);
  const topReach = Math.max(a.fy, b.fy) + 150;
  // How much world must be visible horizontally / vertically.
  const needW = Math.max(380, spread + 360);
  const needH = Math.max(210, topReach + 60);
  const zoomW = WORLD_W / Math.min(WORLD_W, needW);
  const zoomH = WORLD_H / Math.min(WORLD_H, needH);
  const zoom = Math.max(1.0, Math.min(1.55, Math.min(zoomW, zoomH)));
  const viewW = WORLD_W / zoom, viewH = WORLD_H / zoom;
  let cx = (a.x + b.x) / 2;
  cx = Math.max(viewW / 2, Math.min(WORLD_W - viewW / 2, cx));
  let cy = (GROUND_Y + 18) - viewH / 2;       // keep the floor near the bottom
  cy = Math.max(viewH / 2, Math.min(WORLD_H - viewH / 2, cy));
  if (!cam.init) { cam.cx = cx; cam.cy = cy; cam.zoom = zoom; cam.init = true; }
  else {
    const k = 0.14;
    cam.cx += (cx - cam.cx) * k;
    cam.cy += (cy - cam.cy) * k;
    cam.zoom += (zoom - cam.zoom) * k;
  }
}

// Pick the pose for a fighter's current visual state.
function poseFor(f: Fighter, frame: number): Pose {
  switch (f.state) {
    case 'idle': return POSES[(frame >> 4) % 2 ? 'idle2' : 'idle'];
    case 'walkF': return POSES[(frame >> 3) % 2 ? 'walkF' : 'idle'];
    case 'walkB': return POSES[(frame >> 3) % 2 ? 'walkB' : 'idle'];
    case 'crouch': return POSES.crouch;
    case 'jump': return POSES.jump;
    case 'block': return POSES.block;
    case 'crouchBlock': return POSES.crouchBlock;
    case 'hit': return POSES.hit;
    case 'crouchHit': return POSES.crouchHit;
    case 'launched': return POSES.launched;
    case 'knockdown': case 'ko': return POSES.knockdown;
    case 'getup': return POSES.crouch;
    case 'dizzy': return POSES.dizzy;
    case 'victory': return POSES.victory;
    case 'attack': {
      const m = f.move!;
      return POSES[f.moveFrame < m.startup ? m.startupPose : m.activePose] ?? POSES.idle;
    }
    default: return POSES.idle;
  }
}

function bone(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

export function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, frame: number) {
  const p = poseFor(f, frame);
  const flash = f.hitFlash > 0 && (frame % 2 === 0);
  const pal = f.char.palette;
  const skin = flash ? '#ffffff' : pal.skin;
  const skinSh = flash ? '#ffffff' : pal.skinShade;
  const gi = flash ? '#ffffff' : pal.gi;
  const giSh = flash ? '#ffffff' : pal.giShade;
  const accent = flash ? '#ffffff' : pal.accent;
  const hair = flash ? '#ffffff' : pal.hair;
  const aura = pal.aura;

  // Local -> screen transform (facing mirrors x).
  const TS = (lx: number, ly: number) => ({ x: f.x + f.facing * lx, y: GROUND_Y - f.fy - ly });

  // Derived joints.
  const shF = TS(p.chest.x + 5, p.chest.y + 2);
  const shB = TS(p.chest.x - 7, p.chest.y + 2);
  const hipF = TS(p.pelvis.x + 7, p.pelvis.y);
  const hipB = TS(p.pelvis.x - 7, p.pelvis.y);
  const chest = TS(p.chest.x, p.chest.y);
  const head = TS(p.head.x, p.head.y);
  const elbowF = TS(p.elbowF.x, p.elbowF.y), handF = TS(p.handF.x, p.handF.y);
  const elbowB = TS(p.elbowB.x, p.elbowB.y), handB = TS(p.handB.x, p.handB.y);
  const kneeF = TS(p.kneeF.x, p.kneeF.y), footF = TS(p.footF.x, p.footF.y);
  const kneeB = TS(p.kneeB.x, p.kneeB.y), footB = TS(p.footB.x, p.footB.y);

  // Shadow (scales with height off the ground).
  const shScale = Math.max(0.3, 1 - f.fy / 220);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND_Y + 2, 26 * shScale, 7 * shScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Squash & stretch around the feet based on vertical velocity (springy jumps).
  let sqx = 1, sqy = 1;
  if (f.fy > 0.5) {
    const v = Math.max(-13, Math.min(13, f.vy));
    sqy = Math.max(0.86, Math.min(1.18, 1 + v * 0.011));
    sqx = 1 / sqy;
  }
  const feetX = f.x, feetY = GROUND_Y - f.fy;
  ctx.save();
  if (sqx !== 1 || sqy !== 1) {
    ctx.translate(feetX, feetY);
    ctx.scale(sqx, sqy);
    ctx.translate(-feetX, -feetY);
  }

  // Back limbs (behind torso).
  bone(ctx, hipB.x, hipB.y, kneeB.x, kneeB.y, 13, giSh);
  bone(ctx, kneeB.x, kneeB.y, footB.x, footB.y, 11, giSh);
  drawFoot(ctx, kneeB, footB, accent);
  bone(ctx, shB.x, shB.y, elbowB.x, elbowB.y, 10, giSh);
  bone(ctx, elbowB.x, elbowB.y, handB.x, handB.y, 7, skinSh);
  ctx.fillStyle = skinSh; ctx.beginPath(); ctx.arc(handB.x, handB.y, 5, 0, Math.PI * 2); ctx.fill();

  // Torso (gi top) as a quad from hips to shoulders.
  ctx.fillStyle = gi;
  ctx.beginPath();
  ctx.moveTo(hipB.x, hipB.y);
  ctx.lineTo(shB.x, shB.y);
  ctx.lineTo(shF.x, shF.y);
  ctx.lineTo(hipF.x, hipF.y);
  ctx.closePath();
  ctx.fill();
  // Subtle shading down the back half.
  ctx.fillStyle = giSh;
  ctx.beginPath();
  ctx.moveTo(hipB.x, hipB.y);
  ctx.lineTo(shB.x, shB.y);
  ctx.lineTo(chest.x, chest.y);
  ctx.lineTo((hipB.x + hipF.x) / 2, (hipB.y + hipF.y) / 2);
  ctx.closePath();
  ctx.fill();
  // Belt.
  ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(hipB.x, hipB.y); ctx.lineTo(hipF.x, hipF.y); ctx.stroke();
  // Belt knot tail.
  ctx.fillStyle = accent;
  ctx.fillRect((hipF.x + hipB.x) / 2 - 2, (hipF.y + hipB.y) / 2, 4, 12);

  // Front leg (over torso).
  bone(ctx, hipF.x, hipF.y, kneeF.x, kneeF.y, 14, gi);
  bone(ctx, kneeF.x, kneeF.y, footF.x, footF.y, 12, gi);
  drawFoot(ctx, kneeF, footF, accent);

  // Neck + head.
  bone(ctx, chest.x, chest.y, head.x, head.y - 8, 9, skin);
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(head.x, head.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skinSh;
  ctx.beginPath(); ctx.arc(head.x - f.facing * 4, head.y, 13, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
  // Hair cap.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(head.x, head.y + 3, 13, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillRect(head.x - 13, head.y + 1, 26, 4);
  // Headband (accent) across the brow.
  ctx.strokeStyle = accent; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(head.x - 13, head.y + 3); ctx.lineTo(head.x + 13, head.y + 3); ctx.stroke();
  // Headband tails fluttering back.
  const tx = head.x - f.facing * 13;
  ctx.beginPath(); ctx.moveTo(tx, head.y + 3);
  ctx.lineTo(tx - f.facing * (10 + (frame % 6)), head.y + 6);
  ctx.lineTo(tx - f.facing * (8 + (frame % 6)), head.y - 1);
  ctx.fillStyle = accent; ctx.fill();
  // Eye (facing forward).
  if (f.state !== 'ko' && f.state !== 'knockdown') {
    ctx.fillStyle = flash ? '#888' : '#1a1a1a';
    ctx.fillRect(head.x + f.facing * 3, head.y, 3, 4);
  }

  // Motion smear: trailing after-images on the striking limb during active frames.
  if (f.move && f.state === 'attack') {
    const m = f.move;
    const inActive = f.moveFrame > m.startup && f.moveFrame <= m.startup + m.active;
    if (inActive) {
      const kick = f.moveKey ? KICK_MOVES.has(f.moveKey) : false;
      const pivot = kick ? kneeF : elbowF;
      const tip = kick ? footF : handF;
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.1 * i;
        bone(ctx, pivot.x - f.facing * i * 4, pivot.y, tip.x - f.facing * i * 5, tip.y, kick ? 12 : 9, aura);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Front arm (top-most, the striking arm).
  bone(ctx, shF.x, shF.y, elbowF.x, elbowF.y, 10, gi);
  bone(ctx, elbowF.x, elbowF.y, handF.x, handF.y, 8, skin);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(handF.x, handF.y, 6, 0, Math.PI * 2); ctx.fill();
  // Wrist wrap accent.
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(handF.x, handF.y, 6, 0, Math.PI * 2); ctx.lineWidth = 0;
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();

  // Dizzy stars.
  if (f.state === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.15 + (i * Math.PI * 2) / 3;
      const sx = head.x + Math.cos(a) * 16;
      const sy = head.y + 18 + Math.sin(a) * 6;
      drawStar(ctx, sx, sy, 5, '#ffe24a');
    }
  }

  ctx.restore(); // end squash & stretch transform
}

function drawFoot(ctx: CanvasRenderingContext2D, knee: { x: number; y: number }, foot: { x: number; y: number }, color: string) {
  const dx = foot.x - knee.x, dy = foot.y - knee.y;
  const len = Math.hypot(dx, dy) || 1;
  const fx = dx / len, fy = dy / len;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(foot.x + fx * 2, foot.y + fy * 1, 9, 6, Math.atan2(dy, dx), 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, state: GameState, frame: number) {
  for (const p of state.projectiles) {
    const sx = p.x, sy = GROUND_Y - p.y;
    const r = (p.spec.super ? p.spec.w / 2 : p.spec.w / 2);
    const pulse = 1 + Math.sin(frame * 0.4) * 0.12;
    // Trail.
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.12 * (5 - i);
      ctx.fillStyle = p.spec.glow;
      ctx.beginPath();
      ctx.arc(sx - Math.sign(p.vx) * i * 7, sy, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const grad = ctx.createRadialGradient(sx, sy, 1, sx, sy, r * pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, p.spec.glow);
    grad.addColorStop(1, p.spec.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * pulse, r * 0.8 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spark ring for supers.
    if (p.spec.super) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = frame * 0.3 + (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        ctx.lineTo(sx + Math.cos(a) * (r + 8), sy + Math.sin(a) * (r + 8));
        ctx.stroke();
      }
    }
  }
}

function drawSparks(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const s of state.sparks) {
    const t = s.life / s.maxLife;
    ctx.globalAlpha = t;
    if (s.kind === 'block') {
      ctx.strokeStyle = s.color; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 10 + i * 6 + (1 - t) * 10, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.stroke();
      }
    } else {
      const n = s.kind === 'super' ? 10 : 6;
      const R = (s.kind === 'super' ? 30 : 18) * (1.4 - t);
      ctx.fillStyle = s.color;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n + (1 - t);
        ctx.beginPath();
        ctx.ellipse(s.x + Math.cos(a) * R, s.y + Math.sin(a) * R, 4, 2, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawStage(ctx: CanvasRenderingContext2D, frame: number) {
  // Sky gradient.
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#241b3a');
  sky.addColorStop(0.6, '#3a2456');
  sky.addColorStop(1, '#7a3b5c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD_W, GROUND_Y);

  // Distant sun/moon.
  ctx.fillStyle = 'rgba(255,210,140,0.5)';
  ctx.beginPath(); ctx.arc(WORLD_W * 0.5, 120, 70, 0, Math.PI * 2); ctx.fill();

  // Skyline silhouette.
  ctx.fillStyle = '#1e1430';
  for (let i = 0; i < 16; i++) {
    const bw = 50 + ((i * 53) % 40);
    const bh = 70 + ((i * 37) % 110);
    ctx.fillRect(i * 58 - 10, GROUND_Y - bh, bw, bh);
  }
  // Lit windows.
  ctx.fillStyle = 'rgba(255,224,150,0.5)';
  for (let i = 0; i < 90; i++) {
    if ((i * 7 + (frame >> 5)) % 5 === 0) continue;
    const wx = 10 + (i * 67) % WORLD_W;
    const wy = GROUND_Y - 30 - (i * 29) % 120;
    ctx.fillRect(wx, wy, 4, 5);
  }

  // Crowd row.
  ctx.fillStyle = '#140d22';
  ctx.fillRect(0, GROUND_Y - 26, WORLD_W, 26);
  for (let i = 0; i < WORLD_W / 18; i++) {
    const bob = Math.sin(frame * 0.08 + i) * 2;
    ctx.fillStyle = i % 3 === 0 ? '#241634' : '#1b1029';
    ctx.beginPath();
    ctx.arc(9 + i * 18, GROUND_Y - 18 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floor.
  const floor = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H);
  floor.addColorStop(0, '#6b4a2f');
  floor.addColorStop(1, '#3a2719');
  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
  // Floor planks.
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * WORLD_W;
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x - 40, WORLD_H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(WORLD_W, GROUND_Y); ctx.stroke();
}

// ---- HUD ----------------------------------------------------------------

function drawHealthBar(ctx: CanvasRenderingContext2D, f: Fighter, side: 0 | 1) {
  const W = 360, H = 22, pad = 24, y = 24;
  const x = side === 0 ? pad : WORLD_W - pad - W;
  const ratio = Math.max(0, f.health / f.char.maxHealth);
  // Frame.
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(x - 3, y - 3, W + 6, H + 6);
  ctx.fillStyle = '#3a0a0a';
  ctx.fillRect(x, y, W, H);
  // Fill (anchored to the inner edge).
  const fillW = W * ratio;
  const fx = side === 0 ? x : x + W - fillW;
  const grad = ctx.createLinearGradient(0, y, 0, y + H);
  grad.addColorStop(0, ratio > 0.3 ? '#ffe14a' : '#ff5a3c');
  grad.addColorStop(1, ratio > 0.3 ? '#ff9a1f' : '#c01818');
  ctx.fillStyle = grad;
  ctx.fillRect(fx, y, fillW, H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(fx, y, fillW, 5);
  // Border.
  ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, W, H);
  // Name.
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = side === 0 ? 'left' : 'right';
  ctx.fillText(f.char.name, side === 0 ? x : x + W, y + H + 18);
  // Round-win pips.
  ctx.fillStyle = '#ffd24a';
  for (let i = 0; i < f.wins; i++) {
    const px = side === 0 ? x + W - 12 - i * 16 : x + 12 + i * 16;
    drawStar(ctx, px, y + H + 12, 6, '#ffd24a');
  }
}

function drawMeter(ctx: CanvasRenderingContext2D, f: Fighter, side: 0 | 1) {
  const W = 200, H = 12, pad = 24, y = WORLD_H - 22;
  const x = side === 0 ? pad : WORLD_W - pad - W;
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(x - 2, y - 2, W + 4, H + 4);
  ctx.fillStyle = '#10243a'; ctx.fillRect(x, y, W, H);
  const ratio = f.meter / 100;
  const fillW = W * ratio;
  const fx = side === 0 ? x : x + W - fillW;
  ctx.fillStyle = ratio >= 1 ? '#ffe24a' : '#37b7ff';
  ctx.fillRect(fx, y, fillW, H);
  if (ratio >= 1) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace';
    ctx.textAlign = side === 0 ? 'left' : 'right';
    ctx.fillText('SUPER', side === 0 ? x + 4 : x + W - 4, y + 10);
  }
  ctx.strokeStyle = '#2b6da0'; ctx.lineWidth = 1; ctx.strokeRect(x, y, W, H);
}

function drawTimer(ctx: CanvasRenderingContext2D, state: GameState) {
  const secs = Math.max(0, Math.ceil(state.timer / 60));
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(WORLD_W / 2 - 32, 18, 64, 44);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 30px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(secs).padStart(2, '0'), WORLD_W / 2, 42);
  ctx.textBaseline = 'alphabetic';
}

function drawCombo(ctx: CanvasRenderingContext2D, f: Fighter, side: 0 | 1) {
  if (f.comboCount < 2) return;
  const x = side === 0 ? 40 : WORLD_W - 40;
  ctx.textAlign = side === 0 ? 'left' : 'right';
  ctx.fillStyle = '#ffe24a';
  ctx.font = 'bold 28px "Press Start 2P", monospace';
  ctx.fillText(`${f.comboCount}`, x, 110);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('HITS', x + (side === 0 ? 4 : -34), 128);
}

function drawBanner(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.banner) return;
  const b = state.banner;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = b.big ? 56 : 32;
  ctx.font = `bold ${size}px "Press Start 2P", monospace`;
  const cx = WORLD_W / 2, cy = WORLD_H / 2 - 30;
  // Pop-in scale near the start of the banner.
  ctx.fillStyle = '#000';
  ctx.fillText(b.text, cx + 3, cy + 3);
  const grad = ctx.createLinearGradient(0, cy - 30, 0, cy + 30);
  grad.addColorStop(0, '#fff2a8');
  grad.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = grad;
  ctx.fillText(b.text, cx, cy);
  ctx.restore();
}

// Draw a single character in an idle pose, scaled/positioned for select cards.
// Reuses the full fighter renderer via a transient fighter and a canvas transform.
export function drawPortrait(
  ctx: CanvasRenderingContext2D, char: Fighter['char'], cx: number, baseY: number, scale: number, frame: number,
) {
  const fake = {
    x: 0, fy: 0, facing: 1 as 1 | -1, char,
    state: 'idle', move: null, moveFrame: 0, hitFlash: 0,
  } as unknown as Fighter;
  ctx.save();
  ctx.translate(cx, baseY - GROUND_Y * scale);
  ctx.scale(scale, scale);
  drawFighter(ctx, fake, frame);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState) {
  const frame = state.frame;
  const [a, b] = state.fighters;
  updateCamera(a, b);

  ctx.save();
  // Dynamic camera: follow the action, zoom by distance, punch in on big hits.
  const shake = state.shake > 0.5 ? state.shake : 0;
  const zoom = cam.zoom * (1 + Math.min(state.shake, 14) * 0.004);
  ctx.translate(WORLD_W / 2 + (Math.random() - 0.5) * shake, WORLD_H / 2 + (Math.random() - 0.5) * shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.cx, -cam.cy);

  drawStage(ctx, frame);

  // Draw the airborne fighter last so it overlaps (simple depth).
  const order = a.fy >= b.fy ? [b, a] : [a, b];
  for (const f of order) drawFighter(ctx, f, frame);

  drawProjectiles(ctx, state, frame);
  drawSparks(ctx, state);
  ctx.restore();

  // Impact flash on heavy hits.
  if (state.shake > 7) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.22, (state.shake - 7) * 0.03)})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  // HUD (unaffected by camera / shake).
  drawHealthBar(ctx, a, 0);
  drawHealthBar(ctx, b, 1);
  drawMeter(ctx, a, 0);
  drawMeter(ctx, b, 1);
  drawTimer(ctx, state);
  drawCombo(ctx, a, 0);
  drawCombo(ctx, b, 1);
  drawBanner(ctx, state);
}
