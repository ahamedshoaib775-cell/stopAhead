// audioSynthesizer.js - Web Audio API Synthesizer for StopAhead sound alerts

let audioCtx = null;
let activeLoopInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const SOUND_PRESETS = [
  { id: 'chime', name: 'Subway Chime', description: 'Harmonious transit chime' },
  { id: 'radar', name: 'Digital Radar', description: 'Rhythmic tech pinging' },
  { id: 'zen', name: 'Zen Meditation Bell', description: 'Deep resonant bowl chime' },
  { id: 'siren', name: 'High Contrast Siren', description: 'Unmistakable loud alarm' },
  { id: 'harp', name: 'Gentle Harp', description: 'Soft ascending arpeggio' }
];

export function playSoundPreset(soundId = 'chime', volume = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (soundId) {
    case 'chime': {
      // Classic transit 3-note chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);

        gain.gain.setValueAtTime(0, now + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.3 * volume, now + idx * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.85);
      });
      break;
    }

    case 'radar': {
      // Radar pings
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.5, now + i * 0.2); // C6

        gain.gain.setValueAtTime(0.25 * volume, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.14);
      }
      break;
    }

    case 'zen': {
      // Deep meditation bell with long decay
      const freqs = [329.63, 659.25]; // E4, E5
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.4 * volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 2.6);
      });
      break;
    }

    case 'siren': {
      // High contrast alternating siren tones
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.2); // D6
      osc.frequency.setValueAtTime(880, now + 0.4);
      osc.frequency.setValueAtTime(1174.66, now + 0.6);

      gain.gain.setValueAtTime(0.25 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.95);
      break;
    }

    case 'harp':
    default: {
      // Ascending harp pattern
      const harpNotes = [440, 554.37, 659.25, 880];
      harpNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.3 * volume, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.65);
      });
      break;
    }
  }
}

export function startAlertLoop(soundId = 'chime', volume = 0.8) {
  stopAlertLoop();
  playSoundPreset(soundId, volume);
  activeLoopInterval = setInterval(() => {
    playSoundPreset(soundId, volume);
  }, 1500);
}

export function stopAlertLoop() {
  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
}
