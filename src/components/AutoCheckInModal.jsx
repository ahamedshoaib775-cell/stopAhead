// AutoCheckInModal.jsx - Gentle "Are you okay?" Auto Check-In Overlay
import React from 'react';
import { HelpCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { t } from '../utils/i18n';

export default function AutoCheckInModal({ onSafe, onSOS, lang = 'en' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        background: 'rgba(4, 9, 20, 0.92)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="quiet-card"
        style={{
          maxWidth: '380px',
          width: '100%',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--accent)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.6)',
          padding: '1.75rem 1.5rem',
          textAlign: 'center'
        }}
      >
        <HelpCircle size={44} color="var(--accent)" style={{ margin: '0 auto 1rem auto' }} />

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          {t('areYouOkay', lang)}
        </h3>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.45 }}>
          {t('checkInDesc', lang)}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button
            className="btn-primary"
            onClick={onSafe}
            style={{ width: '100%', padding: '0.85rem' }}
          >
            <CheckCircle2 size={18} />
            <span>{t('imSafe', lang)}</span>
          </button>

          <button
            onClick={onSOS}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 82, 82, 0.15)',
              border: '1px solid rgba(255, 82, 82, 0.4)',
              color: '#ff5252',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <ShieldAlert size={18} />
            <span>{t('triggerSosNow', lang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
