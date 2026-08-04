// speechService.js - Web Speech API Voice Alerts helper supporting English & Tamil
/**
 * Speaks a voice alert announcement using browser SpeechSynthesis
 */
export function speakVoiceAlert(text = "Your stop is approaching. Please prepare to get off.", lang = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[StopAhead Speech] Web Speech API not supported in this environment.');
    return;
  }

  try {
    // Cancel any ongoing speech announcements
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    let targetVoice = null;

    if (lang === 'ta') {
      utterance.lang = 'ta-IN';
      targetVoice = voices.find((v) => v.lang.startsWith('ta'));
    } else {
      utterance.lang = 'en-US';
      targetVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      ) || voices.find((v) => v.lang.startsWith('en'));
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    console.log(`[StopAhead Speech] Speaking alert announcement (${lang}): "${text}"`);
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[StopAhead Speech] SpeechSynthesis error:', err);
  }
}

/**
 * Stop any ongoing speech announcements immediately
 */
export function stopVoiceAlert() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}
