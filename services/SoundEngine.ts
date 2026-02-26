
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      // Defer initialization until interaction if possible, but we'll try to init
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Default volume
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = val;
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
        this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
  }

  // --- SFX Generators ---

  public playSmash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // 1. Low Boom (Impact)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    
    gain.gain.setValueAtTime(1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.start(t);
    osc.stop(t + 0.5);

    // 2. Noise Burst (Debris)
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = this.ctx.createGain();

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    
    noise.start(t);
  }

  public playRebuild() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;

    // Magical Rising Arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C Major
    
    notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        osc.connect(gain);
        gain.connect(this.masterGain!);
        
        const startTime = t + (i * 0.05);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        
        osc.start(startTime);
        osc.stop(startTime + 0.6);
    });

    // Reverse Cymbal-ish Swell
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    
    osc2.frequency.setValueAtTime(200, t);
    osc2.frequency.linearRampToValueAtTime(800, t + 1.0);
    
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.1, t + 0.8);
    gain2.gain.linearRampToValueAtTime(0, t + 1.0);
    
    osc2.start(t);
    osc2.stop(t + 1.0);
  }

  public playPop() {
    if (!this.ctx || this.isMuted) return;
    // this.resume(); // Don't resume on every pop, too aggressive

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Random pitch
    osc.frequency.value = 800 + Math.random() * 400;
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playClatter() {
    if (!this.ctx || this.isMuted) return;
    
    // Play a few random pops to simulate debris hitting floor
    const count = 3 + Math.floor(Math.random() * 3);
    for(let i=0; i<count; i++) {
        setTimeout(() => this.playPop(), i * 50 + Math.random() * 50);
    }
  }
}

export const soundEngine = new SoundEngine();
