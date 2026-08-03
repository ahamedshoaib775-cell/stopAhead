// ArrivalAlertModal.jsx - The ONE bold moment: Fullscreen takeover alert
import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Bell, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { startAlertLoop, stopAlertLoop } from '../utils/audioSynthesizer';
import { triggerVibration, stopVibration } from '../utils/vibrationHelper';

export default function ArrivalAlertModal({
  activeTrip,
  soundId,
  alertStyle,
  isHighContrast,
  onGettingOff,
  onSnooze,
  onExtendMinutes
}) {
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 }
      });
    } catch (e) {}

    if (alertStyle === 'both' || alertStyle === 'sound') {
      startAlertLoop(soundId || 'chime', 0.9);
    }
    if (alertStyle === 'both' || alertStyle === 'vibration') {
      triggerVibration('arrival');
    }

    return () => {
      stopAlertLoop();
      stopVibration();
    };
  }, [soundId, alertStyle]);

  if (!activeTrip) return null;

  const handleDismiss = () => {
    console.log('[StopAhead Alarm] State transition: alarm_triggered → dismissed');
    stopAlertLoop();
    stopVibration();
    if (onGettingOff) onGettingOff();
  };

  const handleSnoozeAction = (extraStops) => {
    console.log('[StopAhead Alarm] State transition: alarm_triggered → dismissed (Snoozed)');
    stopAlertLoop();
    stopVibration();
    if (onSnooze) onSnooze(extraStops);
  };

  return (
    <div className={`arrival-alert-overlay ${isHighContrast ? 'high-contrast' : ''}`}>
      <div className="arrival-badge-tag">
        <Bell size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        <span>DESTINATION ARRIVAL ALERT</span>
      </div>

      <div style={{ margin: 'auto 0' }}>
        <h1 className="arrival-main-title">
          YOUR STOP IS HERE
        </h1>

        <div className="arrival-stop-name">
          {activeTrip.destinationStop?.name || 'Destination'}
        </div>

        <p style={{ fontSize: '1rem', marginTop: '0.8rem', opacity: 0.85, fontWeight: 500 }}>
          Get ready to exit your vehicle now.
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            padding: '1.1rem',
            background: '#040914',
            color: '#00E5FF',
            fontWeight: 800,
            fontSize: '1.1rem',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}
          id="btn-im-getting-off"
        >
          <CheckCircle2 size={22} color="#00E5FF" />
          <span>I'M GETTING OFF NOW</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <button
            onClick={() => handleSnoozeAction(2)}
            style={{
              padding: '0.8rem',
              background: 'rgba(4, 9, 20, 0.15)',
              border: '1px solid rgba(4, 9, 20, 0.3)',
              color: '#040914',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <RotateCcw size={15} />
            <span>Snooze (+2 Stops)</span>
          </button>

          <button
            onClick={handleDismiss}
            style={{
              padding: '0.8rem',
              background: 'rgba(255, 82, 82, 0.2)',
              border: '1px solid rgba(255, 82, 82, 0.5)',
              color: '#ff5252',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
            id="btn-silence-alarm-fallback"
          >
            <Clock size={15} />
            <span>Silence & Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}
