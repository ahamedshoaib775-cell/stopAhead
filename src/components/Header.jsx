// Header.jsx - Wordmark header with custom SA logo & Vercel deployment badge
import React, { useState, useEffect } from 'react';

export default function Header({ onNavigate, user }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  const initial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';

  return (
    <header className="app-header">
      <div
        className="logo-wordmark"
        onClick={() => onNavigate('home')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
      >
        {/* Official Cropped StopAhead Logo Pin Mark */}
        <img
          src="/logo-icon.png"
          alt="StopAhead Icon"
          style={{
            width: '32px',
            height: '32px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 8px rgba(2, 90, 237, 0.35))'
          }}
        />

        <span className="logo-wordmark-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>StopAhead</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>


        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {currentTime}
        </span>

        {user && (
          <div
            onClick={() => onNavigate('settings')}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={user.email}
            id="user-profile-badge"
          >
            {initial.toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
