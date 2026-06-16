// ===== Lightweight Web Audio sound effects (no assets, synthesized). =====

export type Sfx =
  | 'step' | 'turn' | 'door' | 'chest' | 'gold' | 'gem' | 'encounter'
  | 'attack' | 'crit' | 'hit' | 'miss' | 'enemy_die'
  | 'spell' | 'fire' | 'ice' | 'shock' | 'holy' | 'heal' | 'magic'
  | 'poison' | 'paralyze' | 'sleep'
  | 'hurt' | 'down' | 'levelup' | 'victory' | 'defeat'
  | 'rest' | 'portal' | 'buy' | 'select' | 'error' | 'trap';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  resume() { this.ensure(); }
  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }

  private tone(freq: number, type: OscillatorType, dur: number, vol = 0.08, delay = 0, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.1, delay = 0, hp = false) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (hp ? (1 - i / n) : 1);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(t0);
  }

  private seq(notes: number[], step = 0.09, type: OscillatorType = 'square', vol = 0.08) {
    notes.forEach((f, i) => this.tone(f, type, step * 1.4, vol, i * step));
  }

  play(name: Sfx) {
    if (!this.enabled) return;
    switch (name) {
      case 'step': this.tone(150, 'square', 0.05, 0.035); break;
      case 'turn': this.tone(300, 'sine', 0.04, 0.025); break;
      case 'door': this.tone(120, 'sawtooth', 0.35, 0.06, 0, 60); break;
      case 'chest': this.seq([523, 659, 784], 0.08, 'triangle', 0.07); break;
      case 'gold': this.tone(988, 'sine', 0.08, 0.07); this.tone(1319, 'sine', 0.12, 0.06, 0.06); break;
      case 'gem': this.seq([784, 1047, 1319, 1568], 0.05, 'sine', 0.06); break;
      case 'encounter': this.tone(180, 'sawtooth', 0.18, 0.08); this.tone(140, 'sawtooth', 0.22, 0.08, 0.12); break;
      case 'attack': this.tone(420, 'square', 0.08, 0.06, 0, 180); break;
      case 'crit': this.tone(640, 'square', 0.06, 0.09, 0, 240); this.tone(900, 'square', 0.1, 0.07, 0.05, 300); break;
      case 'hit': this.noise(0.08, 0.07); this.tone(200, 'square', 0.06, 0.05); break;
      case 'miss': this.noise(0.06, 0.04, 0, true); break;
      case 'enemy_die': this.tone(420, 'sawtooth', 0.3, 0.07, 0, 70); this.noise(0.18, 0.06, 0.02); break;
      case 'spell': case 'magic': this.tone(700, 'triangle', 0.18, 0.06, 0, 1400); break;
      case 'fire': this.noise(0.25, 0.08, 0, true); this.tone(300, 'sawtooth', 0.25, 0.05, 0, 90); break;
      case 'ice': this.seq([1319, 1047, 880, 740], 0.04, 'sine', 0.05); break;
      case 'shock': this.tone(1200, 'square', 0.05, 0.06); this.tone(1800, 'square', 0.06, 0.05, 0.04); this.noise(0.06, 0.04, 0.02); break;
      case 'holy': this.seq([784, 988, 1319, 1568], 0.06, 'sine', 0.06); break;
      case 'heal': this.seq([659, 784, 988], 0.07, 'sine', 0.06); break;
      case 'poison': this.tone(160, 'sawtooth', 0.3, 0.05, 0, 110); break;
      case 'paralyze': this.tone(90, 'square', 0.25, 0.06, 0, 70); break;
      case 'sleep': this.tone(440, 'sine', 0.4, 0.05, 0, 180); break;
      case 'hurt': this.noise(0.12, 0.09); this.tone(160, 'square', 0.12, 0.06); break;
      case 'down': this.tone(220, 'sawtooth', 0.4, 0.08, 0, 60); break;
      case 'levelup': this.seq([523, 659, 784, 1047], 0.1, 'square', 0.07); break;
      case 'victory': this.seq([523, 659, 784, 1047, 1319], 0.12, 'square', 0.08); break;
      case 'defeat': this.seq([392, 330, 262, 196], 0.18, 'sawtooth', 0.08); break;
      case 'rest': this.seq([330, 392, 440], 0.18, 'sine', 0.05); break;
      case 'portal': this.tone(400, 'sine', 0.5, 0.07, 0, 1600); break;
      case 'buy': this.tone(880, 'sine', 0.06, 0.05); this.tone(1175, 'sine', 0.1, 0.05, 0.05); break;
      case 'trap': this.noise(0.2, 0.1); this.tone(140, 'sawtooth', 0.2, 0.07, 0, 70); break;
      case 'select': this.tone(440, 'square', 0.04, 0.035); break;
      case 'error': this.tone(160, 'square', 0.16, 0.06); break;
    }
  }
}

export const soundService = new SoundService();

// Pick an SFX for an elemental spell.
export function elementSfx(element?: string): Sfx {
  switch (element) {
    case 'fire': return 'fire';
    case 'cold': return 'ice';
    case 'electric': return 'shock';
    case 'holy': return 'holy';
    default: return 'spell';
  }
}
