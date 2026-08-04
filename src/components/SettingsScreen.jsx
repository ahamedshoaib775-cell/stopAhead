import React, { useState, useEffect } from 'react';
import { Bell, Eye, Radio, RotateCcw, Volume2, LogOut, UserCheck, Languages, Mic, ShieldAlert, Phone, User, CheckCircle2 } from 'lucide-react';
import { SOUND_PRESETS, playSoundPreset } from '../utils/audioSynthesizer';
import { triggerVibration } from '../utils/vibrationHelper';
import { t, getLanguage, setLanguage } from '../utils/i18n';
import { fetchEmergencyContact, saveEmergencyContact } from '../utils/dbService';

export default function SettingsScreen({ settings, onUpdateSettings, onResetSettings, user, onSignOut }) {
  const {
    alertStyle,
    alertSound,
    themeMode,
    isHighContrast,
    voiceAlertsEnabled
  } = settings;

  const [currentLang, setCurrentLangState] = useState(getLanguage());
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    fetchEmergencyContact(user?.id).then((c) => {
      if (c) {
        setContactName(c.contact_name || '');
        setContactPhone(c.phone_number || '');
      }
    });
  }, [user?.id]);

  const handleLanguageChange = (langKey) => {
    setLanguage(langKey);
    setCurrentLangState(langKey);
    onUpdateSettings({ language: langKey });
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    await saveEmergencyContact(user?.id, { name: contactName.trim(), phone: contactPhone.trim() });
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2500);
  };

  const handleTestSound = (soundId) => {
    playSoundPreset(soundId);
    triggerVibration('tap');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'StopAhead User';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{t('settingsTitle', currentLang)}</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Manage your account profile, language, alerts, and emergency contact.
        </p>
      </div>

      {/* Account Profile Card */}
      {user && (
        <div className="quiet-card" style={{ border: '1px solid rgba(2, 90, 237, 0.25)', background: 'rgba(2, 90, 237, 0.05)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            Account Profile
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <UserCheck size={18} color="var(--accent)" />
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={onSignOut}
            style={{ width: '100%', borderColor: 'rgba(255, 82, 82, 0.4)', color: '#ff5252' }}
            id="btn-sign-out"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* Language / மொழி Picker */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Languages size={15} color="var(--accent)" />
          <span>{t('language', currentLang)}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {[
            { key: 'en', label: 'English' },
            { key: 'ta', label: 'தமிழ் (Tamil)' }
          ].map((lang) => {
            const isSelected = currentLang === lang.key;
            return (
              <button
                key={lang.key}
                type="button"
                onClick={() => handleLanguageChange(lang.key)}
                style={{
                  padding: '0.75rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
                id={`btn-lang-${lang.key}`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Contact Setup */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldAlert size={15} color="#ff5252" />
          <span>{t('emergencyContact', currentLang)}</span>
        </div>

        <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              {t('contactName', currentLang)}
            </label>
            <input
              type="text"
              placeholder="e.g. Family Member / Spouse"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              {t('contactPhone', currentLang)}
            </label>
            <input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-secondary"
            style={{ width: '100%', color: contactSaved ? '#10b981' : 'var(--accent)', borderColor: contactSaved ? '#10b981' : 'var(--accent)' }}
          >
            {contactSaved ? <CheckCircle2 size={16} /> : null}
            <span>{contactSaved ? 'Contact Saved!' : t('saveContact', currentLang)}</span>
          </button>
        </form>
      </div>

      {/* Alert Delivery & Voice Announcements */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Alert Delivery & Audio
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { id: 'both', label: 'Sound + Vibration' },
            { id: 'sound', label: 'Sound Only' },
            { id: 'vibration', label: 'Vibration Only' },
            { id: 'silent', label: 'Silent (Visual Only)' }
          ].map((style) => {
            const isSelected = alertStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onUpdateSettings({ alertStyle: style.id })}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {style.label}
              </button>
            );
          })}
        </div>

        {/* Voice Announcement Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.6rem 0', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mic size={16} color="var(--accent)" />
              <span>{t('voiceAlerts', currentLang)}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {t('voiceAlertsDesc', currentLang)}
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!voiceAlertsEnabled}
            onChange={(e) => onUpdateSettings({ voiceAlertsEnabled: e.target.checked })}
            style={{ width: 20, height: 20, cursor: 'pointer' }}
          />
        </div>

        {/* Tone Picker */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
          Alarm Preset Tone
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {SOUND_PRESETS.map((preset) => {
            const isSelected = alertSound === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onUpdateSettings({ alertSound: preset.id });
                  handleTestSound(preset.id);
                }}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(2, 90, 237, 0.12)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: isSelected ? 700 : 500 }}>
                  {preset.name}
                </span>
                <Volume2 size={16} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual & Accessibility */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          {t('appTheme', currentLang)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
          <span style={{ fontSize: '0.88rem' }}>Theme Mode</span>
          <button
            onClick={() => onUpdateSettings({ themeMode: themeMode === 'dark' ? 'light' : 'dark' })}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem' }}>{t('highContrast', currentLang)}</span>
          <input
            type="checkbox"
            checked={isHighContrast}
            onChange={(e) => onUpdateSettings({ isHighContrast: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Reset */}
      <button className="btn-secondary" onClick={onResetSettings} style={{ padding: '0.75rem' }}>
        <RotateCcw size={15} />
        <span>Reset Settings to Defaults</span>
      </button>
    </div>
  );
}

