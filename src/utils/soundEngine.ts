/**
 * Lightweight procedural Web Audio synthesizer for preview ambience
 * (soft rain, mudflow rumble, and hikmah/dalil reflection chime).
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private enabled = false;
  private lastSceneId = '';

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (next) {
      this.ensureInitialized();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    } else {
      if (this.rainGain && this.ctx) {
        this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
      if (this.rumbleGain && this.ctx) {
        this.rumbleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
    }
  }

  private ensureInitialized(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // White noise buffer for rain & rumble
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Rain band-pass noise
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.7;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);
    rainSource.start();

    // Mudflow low-pass rumble
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = buffer;
    rumbleSource.loop = true;
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 140;
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.ctx.destination);
    rumbleSource.start();
  }

  public updateAmbience(
    isPlaying: boolean,
    rainIntensity: number,
    mudflowActive: boolean,
    sceneId: string,
    sceneType: 'narrative' | 'hikmah' | 'dalil'
  ): void {
    if (!this.enabled || !this.ctx || !this.rainGain || !this.rumbleGain) {
      return;
    }

    const targetRain = isPlaying ? rainIntensity * 0.08 : 0;
    const targetRumble = isPlaying && mudflowActive ? 0.14 : 0;

    this.rainGain.gain.setTargetAtTime(targetRain, this.ctx.currentTime, 0.2);
    this.rumbleGain.gain.setTargetAtTime(targetRumble, this.ctx.currentTime, 0.2);

    if (isPlaying && sceneId !== this.lastSceneId) {
      this.lastSceneId = sceneId;
      if (sceneType === 'hikmah' || sceneType === 'dalil') {
        this.playChime(sceneType === 'dalil' ? 528 : 440);
      }
    }
  }

  private playChime(freq: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.8);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  }
}

export const soundEngine = new SoundEngine();
