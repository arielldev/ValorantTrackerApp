type Kind = "hover" | "click" | "tab" | "star" | "unstar" | "open" | "close" | "confirm" | "error" | "refresh";

let ctx: AudioContext | null = null;
let enabled = true;
let lastHover = 0;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  { freq, to, type = "square", dur = 0.06, gain = 0.05, delay = 0, curve = 0.008 }: {
    freq: number;
    to?: number;
    type?: OscillatorType;
    dur?: number;
    gain?: number;
    delay?: number;
    curve?: number;
  },
) {
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 400;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + curve);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(c: AudioContext, { dur = 0.05, gain = 0.03, delay = 0, hp = 2000 }: { dur?: number; gain?: number; delay?: number; hp?: number }) {
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

const PLAY: Record<Kind, (c: AudioContext) => void> = {
  hover: (c) => tone(c, { freq: 1800, to: 1400, type: "triangle", dur: 0.035, gain: 0.02 }),
  click: (c) => {
    tone(c, { freq: 900, to: 500, type: "square", dur: 0.05, gain: 0.04 });
    noise(c, { dur: 0.03, gain: 0.02, hp: 3000 });
  },
  tab: (c) => {
    tone(c, { freq: 900, to: 520, type: "square", dur: 0.05, gain: 0.05 });
    tone(c, { freq: 700, to: 1200, type: "triangle", dur: 0.11, gain: 0.07, delay: 0.02 });
    noise(c, { dur: 0.05, gain: 0.03, hp: 3500 });
  },
  star: (c) => {
    tone(c, { freq: 1200, type: "sine", dur: 0.09, gain: 0.05 });
    tone(c, { freq: 1800, type: "sine", dur: 0.12, gain: 0.045, delay: 0.05 });
    tone(c, { freq: 2400, type: "sine", dur: 0.16, gain: 0.04, delay: 0.1 });
  },
  unstar: (c) => {
    tone(c, { freq: 1400, to: 700, type: "sine", dur: 0.1, gain: 0.04 });
  },
  open: (c) => {
    noise(c, { dur: 0.08, gain: 0.025, hp: 1500 });
    tone(c, { freq: 500, to: 1000, type: "triangle", dur: 0.09, gain: 0.035 });
  },
  close: (c) => {
    noise(c, { dur: 0.06, gain: 0.02, hp: 1500 });
    tone(c, { freq: 900, to: 450, type: "triangle", dur: 0.08, gain: 0.03 });
  },
  confirm: (c) => {
    tone(c, { freq: 880, type: "square", dur: 0.07, gain: 0.035 });
    tone(c, { freq: 1320, type: "square", dur: 0.12, gain: 0.035, delay: 0.07 });
  },
  error: (c) => {
    tone(c, { freq: 300, to: 180, type: "sawtooth", dur: 0.16, gain: 0.04 });
  },
  refresh: (c) => {
    tone(c, { freq: 600, to: 1600, type: "sine", dur: 0.18, gain: 0.03 });
    noise(c, { dur: 0.12, gain: 0.015, hp: 2500, delay: 0.02 });
  },
};

export const sfx = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  play(kind: Kind) {
    if (!enabled) return;
    if (kind === "hover") {
      const now = performance.now();
      if (now - lastHover < 40) return;
      lastHover = now;
    }
    const c = ac();
    if (!c) return;
    try {
      PLAY[kind](c);
    } catch {

    }
  },
  unlock() {
    ac();
  },
};

export const canHover = typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;
