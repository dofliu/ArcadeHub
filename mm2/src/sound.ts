// ===== Lightweight Web Audio sound effects (no assets, synthesized). =====
// The pure engine never touches the browser; it only pushes event names onto
// GameState.sfx, and the UI flushes them through this service.

export type Sfx =
  | 'step' | 'turn' | 'door' | 'chest' | 'gold' | 'encounter'
  | 'attack' | 'crit' | 'hit' | 'enemy_die'
  | 'spell' | 'heal' | 'magic'
  | 'hurt' | 'down' | 'levelup' | 'victory' | 'defeat'
  | 'recruit' | 'coin' | 'select' | 'error';

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

  private noise(dur: number, vol = 0.1, delay = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
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
      case 'step': this.tone(150, 'square', 0.05, 0.04); break;
      case 'turn': this.tone(300, 'sine', 0.04, 0.03); break;
      case 'door': this.tone(120, 'sawtooth', 0.35, 0.06, 0, 60); break;
      case 'chest': this.seq([523, 659, 784], 0.08, 'triangle', 0.07); break;
      case 'gold': case 'coin': this.tone(988, 'sine', 0.08, 0.07); this.tone(1319, 'sine', 0.12, 0.06, 0.06); break;
      case 'encounter': this.tone(180, 'sawtooth', 0.18, 0.08); this.tone(140, 'sawtooth', 0.22, 0.08, 0.12); break;
      case 'attack': this.tone(420, 'square', 0.08, 0.06, 0, 180); break;
      case 'crit': this.tone(640, 'square', 0.06, 0.08, 0, 240); this.tone(900, 'square', 0.1, 0.07, 0.05, 300); break;
      case 'hit': this.noise(0.08, 0.07); this.tone(200, 'square', 0.06, 0.05); break;
      case 'enemy_die': this.tone(420, 'sawtooth', 0.3, 0.07, 0, 70); this.noise(0.18, 0.06, 0.02); break;
      case 'spell': this.tone(700, 'triangle', 0.18, 0.06, 0, 1400); break;
      case 'magic': this.tone(600, 'sine', 0.25, 0.06, 0, 1600); break;
      case 'heal': this.seq([659, 784, 988], 0.07, 'sine', 0.06); break;
      case 'hurt': this.noise(0.12, 0.09); this.tone(160, 'square', 0.12, 0.06); break;
      case 'down': this.tone(220, 'sawtooth', 0.4, 0.08, 0, 60); break;
      case 'levelup': this.seq([523, 659, 784, 1047], 0.1, 'square', 0.07); break;
      case 'victory': this.seq([523, 659, 784, 1047, 1319], 0.12, 'square', 0.08); break;
      case 'defeat': this.seq([392, 330, 262, 196], 0.18, 'sawtooth', 0.08); break;
      case 'recruit': this.seq([440, 587, 740], 0.09, 'triangle', 0.07); break;
      case 'select': this.tone(440, 'square', 0.04, 0.04); break;
      case 'error': this.tone(160, 'square', 0.16, 0.07); break;
    }
  }
}

export const soundService = new SoundService();
