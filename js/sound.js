// sound.js — Web Audio API sound system for Math Guessr
// All sounds synthesized — no external files needed

const Sound = (() => {
  let ctx = null;
  let enabled = true;
  let tickInterval = null;
  let tickSpeed = 1000; // ms between ticks

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function ensureContext() {
    // Call on first user interaction to unlock audio
    getContext();
  }

  // --- Tone primitives ---

  function playTone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
    if (!enabled) return;
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  }

  function playNoise(duration, volume = 0.05, delay = 0) {
    if (!enabled) return;
    const ac = getContext();
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, ac.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    noise.connect(gain);
    gain.connect(ac.destination);
    noise.start(ac.currentTime + delay);
  }

  // --- Game sounds ---

  function tick(urgent) {
    if (!enabled) return;
    if (urgent) {
      // Urgent tick — higher pitch, sharper
      playTone(880, 0.06, 'square', 0.08);
    } else {
      // Normal tick — soft click
      playTone(600, 0.04, 'sine', 0.05);
    }
  }

  function warning() {
    // Two-tone warning beep
    playTone(440, 0.1, 'square', 0.1);
    playTone(520, 0.1, 'square', 0.1, 0.12);
  }

  function timeUp() {
    // Descending buzz
    if (!enabled) return;
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.4);
    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.5);
  }

  function submit() {
    // Quick click confirmation
    playTone(700, 0.05, 'sine', 0.1);
    playTone(900, 0.05, 'sine', 0.08, 0.05);
  }

  function resultGood() {
    // Ascending arpeggio — satisfying
    playTone(523, 0.12, 'sine', 0.12, 0);      // C5
    playTone(659, 0.12, 'sine', 0.12, 0.1);     // E5
    playTone(784, 0.12, 'sine', 0.12, 0.2);     // G5
    playTone(1047, 0.2, 'sine', 0.15, 0.3);     // C6
  }

  function resultOk() {
    // Two soft tones
    playTone(440, 0.15, 'sine', 0.1, 0);
    playTone(523, 0.15, 'sine', 0.1, 0.12);
  }

  function resultBad() {
    // Descending minor
    playTone(440, 0.15, 'sine', 0.1, 0);
    playTone(370, 0.2, 'sine', 0.08, 0.15);
  }

  function resultPerfect() {
    // Sparkly fanfare
    playTone(523, 0.1, 'sine', 0.12, 0);
    playTone(659, 0.1, 'sine', 0.12, 0.08);
    playTone(784, 0.1, 'sine', 0.12, 0.16);
    playTone(1047, 0.15, 'sine', 0.15, 0.24);
    playTone(1319, 0.25, 'sine', 0.12, 0.35);
  }

  function scoreCount() {
    // Tiny blip for score counting animation
    playTone(1200, 0.03, 'sine', 0.04);
  }

  function multiplierApply() {
    // Satisfying whoosh for multiplier
    if (!enabled) return;
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ac.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.3);
  }

  function gradeReveal() {
    // Big reveal sound for final grade
    playTone(440, 0.08, 'sine', 0.1, 0);
    playTone(554, 0.08, 'sine', 0.1, 0.06);
    playTone(659, 0.08, 'sine', 0.1, 0.12);
    playTone(880, 0.3, 'triangle', 0.15, 0.2);
  }

  // --- Ticking timer ---

  function startTicking(totalTime) {
    stopTicking();
    let elapsed = 0;
    const scheduleNextTick = () => {
      const fraction = elapsed / totalTime;
      let interval;
      if (fraction < 0.5) {
        // First half: slow ticks
        interval = 1000;
      } else if (fraction < 0.7) {
        // Speeding up
        interval = 600;
      } else if (fraction < 0.85) {
        interval = 400;
      } else if (fraction < 0.95) {
        interval = 250;
      } else {
        // Final moments: rapid
        interval = 150;
      }

      tickInterval = setTimeout(() => {
        const urgent = fraction > 0.7;
        tick(urgent);
        if (fraction >= 0.8 && fraction < 0.81) {
          warning();
        }
        elapsed += interval / 1000;
        scheduleNextTick();
      }, interval);
    };
    // Start after 1 second grace period
    setTimeout(() => {
      if (tickInterval !== null || elapsed > 0) return; // already stopped
      scheduleNextTick();
    }, 1000);
    // Mark as active with a sentinel
    tickInterval = -1;
  }

  function stopTicking() {
    if (tickInterval && tickInterval !== -1) {
      clearTimeout(tickInterval);
    }
    tickInterval = null;
  }

  // --- Toggle ---

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  return {
    ensureContext,
    tick,
    warning,
    timeUp,
    submit,
    resultGood,
    resultOk,
    resultBad,
    resultPerfect,
    scoreCount,
    multiplierApply,
    gradeReveal,
    startTicking,
    stopTicking,
    toggle,
    isEnabled,
  };
})();
