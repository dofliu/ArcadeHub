// ===== Original procedural chiptune music (Web Audio, no assets, no samples). =====
// All melodies/bass lines here are simple original sequences built from scales
// and arpeggios — not derived from any existing song.

const N: Record<string, number> = {
  c2: 65.41, d2: 73.42, e2: 82.41, f2: 87.31, g2: 98.0, a2: 110.0, b2: 123.47,
  c3: 130.81, d3: 146.83, e3: 164.81, f3: 174.61, g3: 196.0, a3: 220.0, b3: 246.94,
  c4: 261.63, d4: 293.66, e4: 329.63, f4: 349.23, g4: 392.0, a4: 440.0, b4: 493.88,
  c5: 523.25, d5: 587.33, e5: 659.25, f5: 698.46, g5: 783.99, a5: 880.0, b5: 987.77, c6: 1046.5,
};
const _ = 0; // rest
const m = (s: string) => s.split(' ').map(t => (t === '.' ? _ : N[t] || _));

interface Track { step: number; melody: number[]; bass: number[]; type: OscillatorType; }

const TRACKS: Record<string, Track> = {
  // Title — calm, heroic (C major)
  title: {
    step: 0.30, type: 'triangle',
    melody: m('c5 . e5 . g5 . e5 . f5 . a5 . g5 . . . e5 . g5 . c6 . a5 . g5 . f5 . e5 . . .'),
    bass: m('c3 c3 g2 g2 a2 a2 e2 e2 f2 f2 c3 c3 g2 g2 g2 g2'),
  },
  // Town — gentle, friendly (C major)
  town: {
    step: 0.26, type: 'square',
    melody: m('c5 e5 g5 e5 a4 c5 e5 c5 f4 a4 c5 a4 g4 b4 d5 g4'),
    bass: m('c3 . . . a2 . . . f2 . . . g2 . . .'),
  },
  // Exploration — mysterious, slow (A minor)
  explore: {
    step: 0.34, type: 'triangle',
    melody: m('a4 . c5 . e5 . d5 . f4 . a4 . e5 . . . g4 . b4 . d5 . c5 . e4 . g4 . a4 . . .'),
    bass: m('a2 . . . f2 . . . c3 . . . g2 . . .'),
  },
  // Combat — driving, fast (A minor)
  combat: {
    step: 0.155, type: 'square',
    melody: m('a4 c5 e5 a5 g5 e5 c5 e5 f5 a4 c5 d5 e5 c5 a4 e4'),
    bass: m('a2 a2 e2 e2 a2 a2 e2 e2 f2 f2 c3 c3 g2 g2 g2 e2'),
  },
  // Victory — triumphant (C major)
  victory: {
    step: 0.20, type: 'square',
    melody: m('c5 e5 g5 c6 g5 c6 e5 g5 a5 c6 . . g5 . . .'),
    bass: m('c3 c3 g2 g2 c3 c3 c3 c3 a2 a2 g2 g2 c3 c3 c3 c3'),
  },
};

class MusicService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = false;
  private track: string | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | 0 = 0;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume(); }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.halt();
    else if (this.track) this.begin(this.track);
  }
  isEnabled() { return this.enabled; }

  play(name: string | null) {
    if (name === this.track) return;
    this.track = name;
    if (!name) { this.halt(); return; }
    if (this.enabled) this.begin(name);
  }

  private begin(name: string) {
    const c = this.ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    this.track = name;
    this.step = 0;
    this.nextTime = c.currentTime + 0.06;
    if (!this.timer) this.timer = setInterval(() => this.sched(), 25);
  }
  private halt() { if (this.timer) { clearInterval(this.timer); this.timer = 0; } }

  private sched() {
    const c = this.ctx;
    if (!c || !this.track || !this.enabled) return;
    const tr = TRACKS[this.track];
    if (!tr) return;
    while (this.nextTime < c.currentTime + 0.13) {
      const mel = tr.melody[this.step % tr.melody.length];
      const bass = tr.bass[this.step % tr.bass.length];
      if (mel) this.note(mel, tr.type, tr.step * 0.92, 0.10, this.nextTime);
      if (bass) this.note(bass, 'triangle', tr.step * 0.98, 0.13, this.nextTime);
      this.step = (this.step + 1) % Math.max(tr.melody.length, tr.bass.length);
      this.nextTime += tr.step;
    }
  }

  private note(freq: number, type: OscillatorType, dur: number, vol: number, t: number) {
    const c = this.ctx, master = this.master;
    if (!c || !master) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
}

export const musicService = new MusicService();

// Map a screen to a music track.
export function trackForScreen(screen: string): string | null {
  if (screen === 'combat') return 'combat';
  if (screen === 'overworld' || screen === 'dungeon') return 'explore';
  if (screen === 'victory') return 'victory';
  if (screen === 'gameover') return null;
  if (screen === 'title' || screen === 'create') return 'title';
  return 'town';
}
