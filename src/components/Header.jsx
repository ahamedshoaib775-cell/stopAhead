// Header.jsx - Wordmark header with custom SA logo & Assistant Chatbot launcher button
import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare } from 'lucide-react';

export default function Header({ onNavigate, user, onOpenChatbot }) {
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
        {/* Assistant Chatbot Launcher */}
        {onOpenChatbot && (
          <button
            type="button"
            onClick={onOpenChatbot}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'rgba(2, 90, 237, 0.15)',
              border: '1px solid var(--accent, #025AED)',
              color: 'var(--accent, #025AED)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
            title="Ask StopAhead AI Assistant"
            id="btn-open-chatbot-header"
          >
            <Bot size={15} />
            <span>AI Assistant</span>
          </button>
        )}

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
