// Lightweight WebAudio sound effects — no external audio assets required.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", delay = 0, gain = 0.07) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g).connect(ac.destination);
  const start = ac.currentTime + delay;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export function playCard() {
  tone(760, 0.045, "square", 0, 0.045);
}

export function playCardBurst(count = 4) {
  for (let i = 0; i < count; i += 1) tone(700 + i * 10, 0.045, "square", i * 0.11, 0.045);
}

export function playChip() {
  tone(1180, 0.035, "triangle", 0, 0.05);
  tone(1560, 0.035, "triangle", 0.02, 0.03);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "sine", i * 0.09, 0.06));
}

export function playLose() {
  [320, 240, 180].forEach((f, i) => tone(f, 0.3, "sawtooth", i * 0.13, 0.045));
}

export function playPush() {
  tone(440, 0.18, "sine", 0, 0.05);
  tone(440, 0.18, "sine", 0.16, 0.04);
}
