// audio.js - Web Audio API procedural sound synthesis for Vice Palms

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engineGain = null;
    this.engineOsc = null;
    this.sirenGain = null;
    this.sirenOsc = null;
    this.radioGain = null;
    this.radioPlaying = false;
    this.radioStep = 0;
    this.radioTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupContinuousSounds();
      }
    } catch {
      this.enabled = false;
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setupContinuousSounds() {
    if (!this.ctx) return;
    // Engine sound
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();

    // Siren sound
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = "sine";
    this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();
  }

  setEnginePitch(speedRatio, inVehicle) {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!inVehicle) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      return;
    }
    const targetFreq = 40 + Math.abs(speedRatio) * 120;
    const targetGain = 0.08 + Math.min(0.12, Math.abs(speedRatio) * 0.1);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  setSirenActive(active) {
    if (!this.ctx || !this.sirenGain) return;
    const now = this.ctx.currentTime;
    if (active) {
      const cycle = (now * 2.5) % 1;
      const freq = cycle < 0.5 ? 650 : 920;
      this.sirenOsc.frequency.setValueAtTime(freq, now);
      this.sirenGain.gain.setTargetAtTime(0.09, now, 0.05);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  playGunshot(type = "pistol") {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Noise burst for gunshot crack
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === "shotgun" ? "lowpass" : "bandpass";
    filter.frequency.setValueAtTime(type === "shotgun" ? 800 : 1800, now);

    const gain = this.ctx.createGain();
    const baseVol = type === "shotgun" ? 0.35 : (type === "rifle" ? 0.28 : 0.22);
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    whiteNoise.start(now);

    // Punchy low pop
    const subOsc = this.ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(type === "shotgun" ? 120 : 180, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.09);
  }

  playExplosion() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playScreech() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playImpact() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playMissionPassed() {
    if (!this.ctx || !this.enabled) return;
    this.ensureContext();
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  startRadio() {
    if (this.radioPlaying || !this.ctx) return;
    this.radioPlaying = true;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 98, 82.41]; // A2, C3, D3 synth progression
    this.radioTimer = setInterval(() => {
      if (!this.radioPlaying || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const freq = bassline[this.radioStep % bassline.length];
      this.radioStep++;

      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }, 220);
  }

  stopRadio() {
    this.radioPlaying = false;
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }
}
