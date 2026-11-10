// ============================================================================
// CHROME HILL ZONE - 16-BIT FM SYNTH AUDIO ENGINE (Web Audio API)
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.ringPanToggle = -0.5;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }
    // iOS Safari WebAudio unlock buffer on first touch gesture
    if (!this.iosUnlocked && this.ctx) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        if (source.start) source.start(0);
        this.iosUnlocked = true;
      } catch (e) {}
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  // Helper: MIDI note to Hz
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // --------------------------------------------------------------------------
  // SOUND EFFECTS
  // --------------------------------------------------------------------------

  playRing() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // Classic stereo alternating ring chime (E6 -> G6 -> E7)
    this.ringPanToggle = -this.ringPanToggle;
    const notes = [76, 79, 88];
    notes.forEach((midi, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), now + idx * 0.048);

      // Slight FM harmonic shimmer
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      mod.type = 'triangle';
      mod.frequency.setValueAtTime(this.midiToFreq(midi) * 2, now + idx * 0.048);
      modGain.gain.setValueAtTime(140, now + idx * 0.048);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now + idx * 0.048);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.048 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.048 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.048);
      mod.start(now + idx * 0.048);
      osc.stop(now + idx * 0.048 + 0.26);
      mod.stop(now + idx * 0.048 + 0.26);
    });
  }

  playJump() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.19);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playSpinDashRev(chargeLevel = 1) {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 220 + chargeLevel * 45;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playSpinRelease() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  playSkid() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.setValueAtTime(760, now + 0.04);
    osc.frequency.setValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playSpring() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.34);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  playBadnikPop() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;

    // White noise burst + low pitch drop
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.21);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playRingLoss() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [83, 79, 75, 72, 81, 77, 74, 70];
    notes.forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), now + i * 0.042);

      gain.gain.setValueAtTime(0.12, now + i * 0.042);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.042 + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.042);
      osc.stop(now + i * 0.042 + 0.12);
    });
  }

  playCheckpoint() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [67, 72, 76, 79, 84];
    notes.forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(this.midiToFreq(midi), now + i * 0.05);
      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.17);
    });
  }

  playVictoryFanfare() {
    if (this.muted) return;
    this.init();
    this.stopMusic();
    const now = this.ctx.currentTime;
    // Classic upbeat stage clear fanfare
    const melody = [
      { n: 72, t: 0.0, d: 0.14 },
      { n: 74, t: 0.15, d: 0.14 },
      { n: 76, t: 0.30, d: 0.14 },
      { n: 79, t: 0.45, d: 0.25 },
      { n: 76, t: 0.72, d: 0.18 },
      { n: 79, t: 0.92, d: 0.35 },
      { n: 84, t: 1.32, d: 0.65 }
    ];
    melody.forEach((item) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.midiToFreq(item.n), now + item.t);
      gain.gain.setValueAtTime(0.13, now + item.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + item.t);
      osc.stop(now + item.t + item.d + 0.02);
    });
  }

  // --------------------------------------------------------------------------
  // BACKGROUND MUSIC (16-Bit Green Hill / Chrome Hill FM Synth Loop)
  // --------------------------------------------------------------------------

  startMusic() {
    if (this.muted || this.musicPlaying) return;
    this.init();
    this.musicPlaying = true;

    // Upbeat 150 BPM 16th-note sequencer (100ms per 16th note)
    const leadPattern = [
      79, null, 76, null, 79, null, 76, 79,
      81, null, 79, null, 76, null, 72, null,
      74, null, 76, null, 77, null, 76, 74,
      72, null, 67, null, 72, null, null, null,

      79, null, 76, null, 79, null, 76, 79,
      84, null, 81, null, 79, null, 76, null,
      74, null, 76, null, 77, null, 79, 81,
      79, null, 74, null, 72, null, null, null
    ];

    const bassPattern = [
      48, null, 48, 60, 48, null, 48, 60,
      53, null, 53, 65, 53, null, 53, 65,
      50, null, 50, 62, 55, null, 55, 67,
      48, null, 55, null, 48, null, 55, null,

      48, null, 48, 60, 48, null, 48, 60,
      53, null, 53, 65, 54, null, 54, 66,
      55, null, 55, 67, 55, null, 55, 67,
      48, null, 52, null, 55, null, 48, null
    ];

    this.musicTimer = setInterval(() => {
      if (this.muted || !this.musicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.stepIndex % leadPattern.length;

      // Lead Synth
      const leadNote = leadPattern[step];
      if (leadNote !== null) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(this.midiToFreq(leadNote), now);
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      }

      // Slap FM Bass
      const bassNote = bassPattern[step];
      if (bassNote !== null) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(this.midiToFreq(bassNote), now);
        gain.gain.setValueAtTime(0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      this.stepIndex++;
    }, 105);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
