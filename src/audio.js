// Synthesized locally: no audio downloads or network required.
export class BoulderAudio {
  constructor(settings) { this.settings = settings; this.context = null; }
  unlock() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      const ctx = this.context;
      this.master = ctx.createGain(); this.master.gain.value = this.settings.muted ? 0 : this.settings.volume; this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), data = buffer.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * .08) / 1.08; data[i] = smooth * 2; }
      this.noise = ctx.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true;
      this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 250;
      this.roll = ctx.createGain(); this.roll.gain.value = 0;
      this.noise.connect(this.filter); this.filter.connect(this.roll); this.roll.connect(this.master); this.noise.start();
    }
    this.context.resume().catch(() => {});
  }
  update(velocity, paused) {
    if (!this.context) return;
    const ctx = this.context, speed = Math.min(1, Math.abs(velocity) / 12);
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.volume, ctx.currentTime, .03);
    this.roll.gain.setTargetAtTime(paused ? 0 : speed * .2, ctx.currentTime, .07);
    this.filter.frequency.setTargetAtTime(140 + speed * 450, ctx.currentTime, .1);
  }
  push() {
    if (!this.context || this.settings.muted) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(105, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + .13);
    gain.gain.setValueAtTime(.18, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
    osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(ctx.currentTime + .17);
  }
}
