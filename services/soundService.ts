
class SoundService {
  private context: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize context lazily on first user interaction
  }

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);

    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  public playMove() {
    // Short blip
    this.playTone(440, 'square', 0.05, 0.05);
  }

  public playRotate() {
    this.playTone(600, 'sine', 0.05, 0.05);
  }

  public playScore() {
    // High pitch ding
    this.playTone(880, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(1100, 'sine', 0.2, 0.1), 50);
  }

  public playExplosion() {
    // Low noise for collision/game over
    if (!this.enabled) return;
    this.initContext();
    if (!this.context) return;
    
    const bufferSize = this.context.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);

    noise.connect(gain);
    gain.connect(this.context.destination);
    noise.start();
  }

  public playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 'square', 0.2, 0.1), i * 100);
    });
  }

  public playShoot() {
     this.playTone(880, 'sawtooth', 0.1, 0.05);
     setTimeout(() => this.playTone(440, 'sawtooth', 0.1, 0.05), 50);
  }
}

export const soundService = new SoundService();
