let audioContext;
let unlockBoundElements = new WeakMap();
let lastCollisionAt = 0;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return null;
  try {
    audioContext ??= new AudioContextType();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  } catch {
    return null;
  }
}

export function bindUnlock(element) {
  if (!element || unlockBoundElements.has(element)) return;
  const unlock = () => { getContext(); };
  element.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  element.addEventListener("keydown", unlock, { capture: true });
  unlockBoundElements.set(element, unlock);
}

export function unbindUnlock(element) {
  const unlock = element && unlockBoundElements.get(element);
  if (!unlock) return;
  element.removeEventListener("pointerdown", unlock, true);
  element.removeEventListener("keydown", unlock, true);
  unlockBoundElements.delete(element);
}

function tone({ frequency, endFrequency = frequency, duration, volume, type = "sine", delay = 0 }) {
  const context = getContext();
  if (!context || context.state !== "running") return;
  try {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch {
    // Sound is optional; audio errors must never interrupt a match.
  }
}

export function playGomokuPlace() {
  tone({ frequency: 250, endFrequency: 145, duration: 0.055, volume: 0.13, type: "triangle" });
  tone({ frequency: 860, endFrequency: 520, duration: 0.022, volume: 0.035, type: "sine", delay: 0.004 });
}

export function playAlkagiLaunch(power = 0.35) {
  const strength = Math.max(0, Math.min(1, power));
  tone({ frequency: 175 + strength * 65, endFrequency: 85 + strength * 28, duration: 0.075, volume: 0.08 + strength * 0.09, type: "triangle" });
  tone({ frequency: 520 + strength * 240, endFrequency: 180 + strength * 90, duration: 0.035, volume: 0.025 + strength * 0.035, type: "sine", delay: 0.008 });
}

export function playAlkagiCollision(impulse = 0) {
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  if (now - lastCollisionAt < 48 || impulse < 24) return;
  lastCollisionAt = now;
  const strength = Math.max(0, Math.min(1, (impulse - 24) / 520));
  tone({ frequency: 300 - strength * 125, endFrequency: 110 - strength * 45, duration: 0.045 + strength * 0.035, volume: 0.035 + strength * 0.14, type: "triangle" });
  if (strength > 0.35) tone({ frequency: 780 - strength * 280, endFrequency: 300 - strength * 120, duration: 0.026, volume: 0.025 + strength * 0.045, type: "sine", delay: 0.003 });
}
