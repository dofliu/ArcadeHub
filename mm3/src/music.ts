// ===== Original procedural chiptune music (Web Audio, no assets, no samples). =====
// Three voices (lead / arpeggio / bass) + optional percussion. All melodies are
// original sequences built from scales and arpeggios — not derived from any song.

const N: Record<string, number> = {
  c2: 65.41, cs2: 69.30, d2: 73.42, ds2: 77.78, e2: 82.41, f2: 87.31, fs2: 92.50, g2: 98.0, gs2: 103.83, a2: 110.0, as2: 116.54, b2: 123.47,
  c3: 130.81, cs3: 138.59, d3: 146.83, ds3: 155.56, e3: 164.81, f3: 174.61, fs3: 185.0, g3: 196.0, gs3: 207.65, a3: 220.0, as3: 233.08, b3: 246.94,
  c4: 261.63, cs4: 277.18, d4: 293.66, ds4: 311.13, e4: 329.63, f4: 349.23, fs4: 369.99, g4: 392.0, gs4: 415.30, a4: 440.0, as4: 466.16, b4: 493.88,
  c5: 523.25, cs5: 554.37, d5: 587.33, ds5: 622.25, e5: 659.25, f5: 698.46, fs5: 739.99, g5: 783.99, gs5: 830.61, a5: 880.0, as5: 932.33, b5: 987.77,
  c6: 1046.5, d6: 1174.66, e6: 1318.51, g6: 1567.98,
};
const _ = 0; // rest
const m = (s: string) => s.split(/\s+/).map(t => (t === '.' ? _ : N[t] || _));

interface Track {
  step: number;
  lead: number[];
  arp: number[];
  bass: number[];
  leadType: OscillatorType;
  arpType: OscillatorType;
  perc?: boolean;       // drum pattern
  swing?: number;       // 0..1 subtle groove
}

const TRACKS: Record<string, Track> = {
  // Title — sweeping, heroic (C major)
  title: {
    step: 0.30, leadType: 'triangle', arpType: 'sine',
    lead: m('c5 . e5 . g5 . e5 . f5 . a5 . g5 . . . e5 . g5 . c6 . a5 . g5 . f5 . e5 . d5 .'),
    arp:  m('c4 e4 g4 e4 f4 a4 c5 a4 g4 b4 d5 b4 c5 e5 g5 e5'),
    bass: m('c3 . g2 . a2 . e2 . f2 . c3 . g2 . g2 .'),
  },
  // Sorpigal town — warm, friendly (C major)
  town: {
    step: 0.25, leadType: 'square', arpType: 'triangle',
    lead: m('c5 e5 g5 e5 a4 c5 e5 c5 f4 a4 c5 a4 g4 b4 d5 g4'),
    arp:  m('e4 g4 c5 g4 c4 e4 a4 e4 f4 a4 c5 a4 g4 b4 d5 b4'),
    bass: m('c3 . . . a2 . . . f2 . . . g2 . . .'),
  },
  // Fountain Head — bright, flowing (G major)
  fountainhead: {
    step: 0.24, leadType: 'triangle', arpType: 'sine',
    lead: m('g4 b4 d5 g5 d5 b4 g4 a4 b4 d5 g5 b5 a5 g5 d5 b4'),
    arp:  m('g3 b3 d4 b3 c4 e4 g4 e4 d4 fs4 a4 fs4 g3 b3 d4 b3'),
    bass: m('g2 . . . c3 . . . d3 . . . g2 . . .'),
  },
  // Wildabar — exotic, desert (D minor / phrygian flavour)
  wildabar: {
    step: 0.23, leadType: 'square', arpType: 'triangle',
    lead: m('d5 . e5 f5 . d5 e5 . a4 . d5 e5 f5 e5 d5 . d5 . f5 g5 . f5 e5 . a5 . g5 f5 e5 f5 d5 .'),
    arp:  m('d4 f4 a4 f4 d4 g4 as4 g4 a3 d4 f4 d4 d4 f4 a4 f4'),
    bass: m('d3 . a2 . as2 . a2 . d3 . a2 . g2 . a2 .'),
  },
  // Overworld — adventurous, open (A minor → C major)
  explore: {
    step: 0.30, leadType: 'triangle', arpType: 'sine',
    lead: m('a4 . c5 . e5 . d5 . f4 . a4 . e5 . c5 . g4 . b4 . d5 . c5 . e4 . g4 . a4 . . .'),
    arp:  m('a3 c4 e4 c4 f3 a3 c4 a3 c4 e4 g4 e4 g3 b3 d4 b3'),
    bass: m('a2 . . . f2 . . . c3 . . . g2 . . .'),
  },
  // Sorpigal dungeon — dark, brooding (A minor)
  dungeon: {
    step: 0.36, leadType: 'triangle', arpType: 'sine',
    lead: m('a4 . . . c5 . b4 . e4 . . . a4 . g4 . f4 . . . e4 . d4 . g4 . . . a4 . . .'),
    arp:  m('a3 . e4 . a3 . e4 . f3 . c4 . e3 . b3 .'),
    bass: m('a2 . . . a2 . . . f2 . . . e2 . . .'),
  },
  // Crypt — sinister, low (D minor, dissonant)
  crypt: {
    step: 0.40, leadType: 'sawtooth', arpType: 'triangle',
    lead: m('d4 . . . f4 . . . cs5 . . . a4 . . . as4 . . . a4 . . . g4 . f4 . e4 . d4 . . .'),
    arp:  m('d3 . a3 . d3 . f3 . a2 . e3 . d3 . a3 .'),
    bass: m('d2 . . . d2 . . . as1 . . . a1 . . .'),
  },
  // Combat — driving (A minor, with drums)
  combat: {
    step: 0.15, leadType: 'square', arpType: 'square', perc: true,
    lead: m('a4 c5 e5 a5 g5 e5 c5 e5 f5 a4 c5 d5 e5 c5 a4 e4'),
    arp:  m('a3 e4 a3 e4 g3 e4 g3 e4 f3 c4 f3 c4 e3 b3 e3 b3'),
    bass: m('a2 a2 e2 e2 a2 a2 e2 e2 f2 f2 c3 c3 g2 g2 g2 e2'),
  },
  // Boss — frantic, heavy (A minor, drums)
  boss: {
    step: 0.125, leadType: 'square', arpType: 'sawtooth', perc: true,
    lead: m('a4 a5 g5 e5 a4 a5 g5 e5 f5 d5 e5 c5 d5 b4 c5 a4 a4 a5 g5 e5 f5 e5 d5 c5 b4 c5 d5 e5 g5 e5 a5 a4'),
    arp:  m('a3 e4 a3 e4 a3 e4 a3 e4 f3 c4 f3 c4 g3 d4 g3 d4'),
    bass: m('a2 . e2 a2 a2 . e2 a2 f2 . c3 f2 g2 . g2 e2'),
  },
  // Victory — triumphant fanfare (C major)
  victory: {
    step: 0.19, leadType: 'square', arpType: 'triangle',
    lead: m('c5 e5 g5 c6 g5 c6 e5 g5 a5 c6 . . g5 . . .'),
    arp:  m('c4 e4 g4 c5 g4 c5 e4 g4 a4 c5 e5 c5 g4 c5 e5 g5'),
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
      this.master.gain.value = 0.15;
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
    while (this.nextTime < c.currentTime + 0.14) {
      const len = Math.max(tr.lead.length, tr.arp.length, tr.bass.length);
      const lead = tr.lead[this.step % tr.lead.length];
      const arp = tr.arp[this.step % tr.arp.length];
      const bass = tr.bass[this.step % tr.bass.length];
      if (lead) this.note(lead, tr.leadType, tr.step * 0.92, 0.10, this.nextTime);
      if (arp) this.note(arp, tr.arpType, tr.step * 0.7, 0.045, this.nextTime);
      if (bass) this.note(bass, 'triangle', tr.step * 0.98, 0.14, this.nextTime);
      if (tr.perc) this.drum(this.step, tr.step, this.nextTime);
      this.step = (this.step + 1) % len;
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
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // simple kick on beats, hat on offbeats
  private drum(step: number, _s: number, t: number) {
    const c = this.ctx, master = this.master;
    if (!c || !master) return;
    if (step % 4 === 0) {
      // kick
      const osc = c.createOscillator(); const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.16);
    } else if (step % 2 === 1) {
      // hat (noise burst)
      const n = Math.floor(c.sampleRate * 0.03);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      src.connect(g); g.connect(master);
      src.start(t);
    }
  }
}

export const musicService = new MusicService();

// Map a screen/context to a music track.
export function trackForScreen(screen: string, opts?: { isBoss?: boolean; mapId?: string; townId?: string }): string | null {
  if (screen === 'combat') return opts?.isBoss ? 'boss' : 'combat';
  if (screen === 'dungeon') {
    if (opts?.mapId?.startsWith('crypt') || opts?.mapId === 'terra_core') return 'crypt';
    return 'dungeon';
  }
  if (screen === 'overworld') return 'explore';
  if (screen === 'victory') return 'victory';
  if (screen === 'gameover') return null;
  if (screen === 'title' || screen === 'create') return 'title';
  if (screen === 'town' || screen === 'shop' || screen === 'dialog') {
    if (opts?.townId === 'fountainhead') return 'fountainhead';
    if (opts?.townId === 'wildabar') return 'wildabar';
    return 'town';
  }
  return 'town';
}
