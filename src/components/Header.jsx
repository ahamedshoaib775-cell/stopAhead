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
        {/* Custom Stylized SA Logo Badge */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: '#0B0E14',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0, 229, 255, 0.25)'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 26 36 C 26 26, 48 25, 48 36 C 48 47, 26 47, 26 59 C 26 71, 50 70, 50 60" stroke="#00E5FF" strokeWidth="10" strokeLinecap="round" fill="none"/>
            <path d="M 58 68 L 69 30 L 80 68 M 62 56 L 76 56" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="70" cy="21" r="6" fill="#00E5FF"/>
          </svg>
        </div>

        <span className="logo-wordmark-text" style={{ fontSize: '1.2rem', fontWeight: 800 }}>StopAhead</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Vercel Official Deployment Badge */}
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'var(--text-primary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'background 0.2s ease'
          }}
          title="Deployed on Vercel"
        >
          <svg width="11" height="10" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#FFFFFF"/>
          </svg>
          <span>Vercel</span>
        </a>

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
