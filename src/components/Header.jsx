// Header.jsx - Minimal wordmark header for StopAhead
import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

export default function Header({ onNavigate, gpsMode }) {
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

  return (
    <header className="app-header">
      <div
        className="logo-wordmark"
        onClick={() => onNavigate('home')}
        style={{ cursor: 'pointer' }}
      >
        <MapPin size={20} className="logo-pin-icon" />
        <span className="logo-wordmark-text">StopAhead</span>
      </div>

      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        {currentTime}
      </div>
    </header>
  );
}
