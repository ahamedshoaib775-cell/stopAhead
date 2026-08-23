// OtpSuccessAnimation.jsx - Polished Branded OTP Verification Success Animation for StopAhead
import React, { useEffect, useState } from 'react';
import { triggerVibration } from '../utils/vibrationHelper';

export default function OtpSuccessAnimation({ onComplete }) {
  const [stage, setStage] = useState(0); // 0: initial, 1: checkmark, 2: logo, 3: tagline, 4: fading out
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Stage 1: Checkmark draw & scale-up + soft haptic pulse (0.2s)
    const t1 = setTimeout(() => {
      setStage(1);
      triggerVibration('success');
    }, 200);

    // Stage 2: Logo / Pin reveal (0.8s)
    const t2 = setTimeout(() => {
      setStage(2);
    }, 800);

    // Stage 3: Tagline reveal "Never Miss Your Stop" (1.6s)
    const t3 = setTimeout(() => {
      setStage(3);
    }, 1600);

    // Stage 4: Fade out & auto-transition to Home (2.2s - 2.5s)
    const t4 = setTimeout(() => {
      setStage(4);
    }, 2200);

    const t5 = setTimeout(() => {
      if (!isDone) {
        setIsDone(true);
        if (onComplete) onComplete();
      }
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const handleTapToSkip = () => {
    if (!isDone) {
      setIsDone(true);
      if (onComplete) onComplete();
    }
  };

  return (
    <div
      onClick={handleTapToSkip}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        opacity: stage === 4 ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes drawCheck {
          0% {
            stroke-dashoffset: 60;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes checkmarkPop {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          70% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes logoSlideUp {
          0% {
            transform: translateY(20px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes taglineFadeIn {
          0% {
            transform: translateY(12px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Container holding checkmark, logo, and tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '340px' }}>
        
        {/* 1. Animated Checkmark Icon (0.2s - 0.8s) */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'rgba(2, 90, 237, 0.08)',
            border: '3px solid #025AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(2, 90, 237, 0.25)',
            animation: stage >= 1 ? 'checkmarkPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none',
            opacity: stage >= 1 ? 1 : 0
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#025AED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline
              points="20 6 9 17 4 12"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: stage >= 1 ? 0 : 60,
                animation: stage >= 1 ? 'drawCheck 0.5s ease-out forwards 0.1s' : 'none'
              }}
            />
          </svg>
        </div>

        {/* 2. StopAhead Logo / Pin Reveal (0.8s - 1.6s) */}
        <div
          style={{
            animation: stage >= 2 ? 'logoSlideUp 0.6s ease-out forwards' : 'none',
            opacity: stage >= 2 ? 1 : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src="/logo-sa.png"
            alt="StopAhead"
            style={{
              width: '100%',
              maxWidth: '220px',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* 3. Tagline Reveal "Never Miss Your Stop" (1.6s - 2.2s) */}
        <div
          style={{
            animation: stage >= 3 ? 'taglineFadeIn 0.5s ease-out forwards' : 'none',
            opacity: stage >= 3 ? 1 : 0
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Never Miss Your Stop
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
            Account verified • Ready for your journey
          </div>
        </div>

        {/* Tap to skip hint */}
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1.5rem', opacity: stage >= 2 ? 0.8 : 0, transition: 'opacity 0.3s' }}>
          Tap anywhere to skip
        </div>
      </div>
    </div>
  );
}
