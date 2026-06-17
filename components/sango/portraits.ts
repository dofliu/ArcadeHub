import { Officer } from './types';

// ===========================================================================
// Procedural pixel-art officer portraits (busts), KOEI-style. Fully drawn from
// a deterministic hash of the officer id — no image assets. Look varies by
// helmet type, facial hair, hair and skin so every general is recognisable.
// ===========================================================================

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const SKINS = ['#e9b48a', '#d99a6c', '#c98e63', '#eac096'];
const HAIRS = ['#1c1410', '#2b2018', '#3a2a1a', '#4a3520'];
const HELMETS = ['#9aa6b2', '#b5824a', '#caa83c', '#7d8a99', '#8d5a3c'];

// Draw a portrait inside the box (x,y,w,h). `accent` tints helmet/armour
// (usually the faction colour); strong officers get a fancier helmet.
export function drawOfficerPortrait(
  ctx: CanvasRenderingContext2D, o: Officer, accent: string, x: number, y: number, w: number, h: number,
) {
  const hsh = hash(o.id);
  const skin = SKINS[hsh % SKINS.length];
  const hair = HAIRS[(hsh >> 3) % HAIRS.length];
  const helmetBase = HELMETS[(hsh >> 6) % HELMETS.length];
  const beardType = (hsh >> 9) % 4;      // 0 none, 1 mustache, 2 full beard, 3 long beard (關羽)
  const helmetType = (hsh >> 12) % 3;    // 0 cap, 1 helmet, 2 crown/headband
  const fierce = o.war >= 90;
  const wise = o.int >= 90;

  ctx.save();
  ctx.translate(x, y);
  // Background panel.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1a2030');
  bg.addColorStop(1, '#0d1119');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const headR = w * 0.28;
  const headY = h * 0.46;

  // Shoulders / armour.
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h);
  ctx.lineTo(w * 0.2, h * 0.74);
  ctx.quadraticCurveTo(cx, h * 0.64, w * 0.8, h * 0.74);
  ctx.lineTo(w * 0.9, h);
  ctx.closePath();
  ctx.fill();
  // Armour collar trim.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(w * 0.32, h * 0.7, w * 0.36, h * 0.05);

  // Neck.
  ctx.fillStyle = skin;
  ctx.fillRect(cx - w * 0.1, headY, w * 0.2, h * 0.28);

  // Head.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR, headR * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cheek shade.
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.ellipse(cx + headR * 0.5, headY + headR * 0.1, headR * 0.5, headR * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair behind helmet.
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(cx, headY - headR * 0.5, headR * 1.05, headR * 0.8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - headR, headY - headR * 0.5, headR * 2, headR * 0.6);

  // Eyebrows (fierce = angled).
  ctx.strokeStyle = hair; ctx.lineWidth = Math.max(2, w * 0.03); ctx.lineCap = 'round';
  const eyeY = headY - headR * 0.05;
  const eyeDx = headR * 0.45;
  ctx.beginPath();
  if (fierce) {
    ctx.moveTo(cx - eyeDx - headR * 0.2, eyeY - headR * 0.35);
    ctx.lineTo(cx - eyeDx + headR * 0.25, eyeY - headR * 0.15);
    ctx.moveTo(cx + eyeDx + headR * 0.2, eyeY - headR * 0.35);
    ctx.lineTo(cx + eyeDx - headR * 0.25, eyeY - headR * 0.15);
  } else {
    ctx.moveTo(cx - eyeDx - headR * 0.2, eyeY - headR * 0.25);
    ctx.lineTo(cx - eyeDx + headR * 0.25, eyeY - headR * 0.28);
    ctx.moveTo(cx + eyeDx + headR * 0.2, eyeY - headR * 0.25);
    ctx.lineTo(cx + eyeDx - headR * 0.25, eyeY - headR * 0.28);
  }
  ctx.stroke();
  // Eyes.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx - eyeDx - w * 0.03, eyeY, w * 0.06, h * 0.03);
  ctx.fillRect(cx + eyeDx - w * 0.03, eyeY, w * 0.06, h * 0.03);

  // Facial hair.
  ctx.fillStyle = hair;
  if (beardType === 1 || beardType === 2 || beardType === 3) {
    ctx.fillRect(cx - headR * 0.4, headY + headR * 0.35, headR * 0.8, headR * 0.18); // mustache
  }
  if (beardType === 2) {
    ctx.beginPath();
    ctx.ellipse(cx, headY + headR * 0.75, headR * 0.55, headR * 0.5, 0, 0, Math.PI);
    ctx.fill();
  }
  if (beardType === 3) { // long flowing beard
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.5, headY + headR * 0.4);
    ctx.quadraticCurveTo(cx, headY + headR * 2.0, cx + headR * 0.5, headY + headR * 0.4);
    ctx.fill();
  }

  // Helmet / headwear.
  ctx.fillStyle = helmetType === 2 ? accent : helmetBase;
  if (helmetType === 0) {
    // Cloth cap.
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.6, headR * 1.05, headR * 0.7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - headR * 1.05, headY - headR * 0.62, headR * 2.1, headR * 0.25);
  } else if (helmetType === 1) {
    // Iron helmet with brim.
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.55, headR * 1.1, headR * 0.85, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b6675';
    ctx.fillRect(cx - headR * 1.15, headY - headR * 0.6, headR * 2.3, headR * 0.22);
    // Plume.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(cx, headY - headR * 1.35);
    ctx.lineTo(cx - headR * 0.2, headY - headR * 0.7);
    ctx.lineTo(cx + headR * 0.2, headY - headR * 0.7);
    ctx.closePath();
    ctx.fill();
  } else {
    // Headband / coronet for strategists & lords.
    ctx.fillStyle = wise ? '#e8e8ef' : accent;
    ctx.fillRect(cx - headR * 1.05, headY - headR * 0.75, headR * 2.1, headR * 0.3);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(cx - headR * 0.15, headY - headR * 0.85, headR * 0.3, headR * 0.25);
  }

  // Frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.restore();
}
