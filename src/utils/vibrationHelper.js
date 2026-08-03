// vibrationHelper.js - Haptic Vibration patterns for StopAhead

export function triggerVibration(pattern = 'arrival') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (pattern === 'proximity') {
        // Double pulse for approaching alert
        navigator.vibrate([200, 100, 200]);
      } else if (pattern === 'arrival') {
        // Strong rhythmic pattern for arrival takeover
        navigator.vibrate([400, 150, 400, 150, 800]);
      } else if (pattern === 'tap') {
        // Subtle haptic feedback for button taps
        navigator.vibrate(40);
      }
    } catch (e) {
      console.warn('Vibration API not supported or blocked:', e);
    }
  }
}

export function stopVibration() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {
      // ignore
    }
  }
}
