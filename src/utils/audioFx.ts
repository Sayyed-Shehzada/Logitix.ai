/**
 * Web Audio API Sci-Fi Synthesizer for Logitix Auth & Interactions
 * Pure client-side synthesis with zero external audio assets.
 */

class AudioSynth {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Futuristic "Access Granted / Decrypting" chord
   */
  public playUnlockSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Frequencies for a crystalline sci-fi major chord (F#4, A#4, C#5, F#5)
      const freqs = [369.99, 466.16, 554.37, 739.99];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.85);
      });

      // Sub-bass sweep
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(70, now + 0.4);

      subGain.gain.setValueAtTime(0.06, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.55);
    } catch {
      // Audio playback fails gracefully if muted or disallowed
    }
  }

  /**
   * Cinematic Hyperspace / Quantum Warp-in synthesizer
   */
  public playWarpIn() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Ascending energy glide
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.9);

      // Filter to soften the sawtooth into a silky sci-fi rush
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.45);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.9);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.15);

      // 2. High crystal chime chord at peak warp
      const chimeFreqs = [523.25, 659.25, 783.99, 1046.5]; // C Major 7 sci-fi sheen
      chimeFreqs.forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.4 + idx * 0.03);

        chimeGain.gain.setValueAtTime(0, now + 0.4 + idx * 0.03);
        chimeGain.gain.linearRampToValueAtTime(0.06, now + 0.4 + idx * 0.03 + 0.03);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);

        chimeOsc.start(now + 0.4 + idx * 0.03);
        chimeOsc.stop(now + 1.45);
      });

      // 3. Sub-bass warp boom
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(160, now + 0.35);
      sub.frequency.exponentialRampToValueAtTime(45, now + 0.85);

      subGain.gain.setValueAtTime(0.12, now + 0.35);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      sub.connect(subGain);
      subGain.connect(ctx.destination);

      sub.start(now + 0.35);
      sub.stop(now + 1.05);
    } catch {
      // Graceful
    }
  }

  /**
   * Sci-fi subtle click / scan pulse
   */
  public playScanBlip() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Graceful
    }
  }
}

export const audioSynth = new AudioSynth();
