// Procedural Web Audio API Wuxia Sound Synthesizer
class WuxiaSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    try {
      const saved = localStorage.getItem('vlkt_sound_muted');
      if (saved === '1') this.muted = true;
    } catch {
      // ignore
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('vlkt_sound_muted', this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    return this.muted;
  }

  playSlash() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playSkill(pitch = 320) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.75, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, now + 0.2);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCrit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLoot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pentatonic guzheng pluck (D5 -> A5)
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.06, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.17);
    });
  }

  playLevelUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm resonant bronze bell / temple gong foundation (D3 -> D2 shimmer)
    const gong = ctx.createOscillator();
    const gongGain = ctx.createGain();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(146.83, now);
    gong.frequency.exponentialRampToValueAtTime(110, now + 0.72);
    gongGain.gain.setValueAtTime(0.14, now);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    gong.connect(gongGain);
    gongGain.connect(ctx.destination);
    gong.start(now);
    gong.stop(now + 0.8);

    // Classic East Asian pentatonic ascension (D4, E4, A4, B4, D5, E5, A5)
    const notes = [293.66, 329.63, 440, 493.88, 587.33, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i >= 4 ? 'sine' : 'triangle';
      const t = now + i * 0.062;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(i === notes.length - 1 ? 0.1 : 0.082, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (i === notes.length - 1 ? 0.65 : 0.38));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (i === notes.length - 1 ? 0.68 : 0.4));
    });
  }

  playWarDrum() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now + offset);
      osc.frequency.exponentialRampToValueAtTime(42, now + offset + 0.28);
      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.31);
    });
  }

  playFail() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(125, now + 0.22);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playChestDrop() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Sparkling jade-bell chime (A5 -> D6 -> E6)
    [880, 1174.66, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  playChestShake() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Accelerating tension beats leading into the chest burst
    const times = [0, 0.16, 0.3, 0.42, 0.52, 0.61, 0.69, 0.76];
    times.forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const base = 260 + i * 52;
      osc.frequency.setValueAtTime(base, now + offset);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, now + offset + 0.07);
      gain.gain.setValueAtTime(0.045 + i * 0.008, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  playChestOpen(isLegendary = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Deep gong impact
    const gong = ctx.createOscillator();
    const gongGain = ctx.createGain();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(isLegendary ? 146.83 : 164.81, now);
    gong.frequency.exponentialRampToValueAtTime(55, now + 0.55);
    gongGain.gain.setValueAtTime(isLegendary ? 0.18 : 0.13, now);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    gong.connect(gongGain);
    gongGain.connect(ctx.destination);
    gong.start(now);
    gong.stop(now + 0.6);

    // Celebratory pentatonic shimmer arpeggio
    const notes = isLegendary
      ? [587.33, 739.99, 880, 1174.66, 1479.98, 1760]
      : [440, 587.33, 659.25, 880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + 0.04 + i * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(isLegendary ? 0.09 : 0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.44);
    });
  }

  playComboTier(tier: 2 | 3 | 5) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes =
      tier === 5
        ? [587.33, 880, 1174.66, 1479.98]
        : tier === 3
        ? [493.88, 739.99, 987.77]
        : [440, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tier === 5 ? 'triangle' : 'sine';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(tier === 5 ? 0.085 : 0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }
}

export const soundEngine = new WuxiaSoundEngine();
