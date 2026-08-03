import { Bell, Eye, Radio, RotateCcw, Volume2, LogOut, UserCheck } from 'lucide-react';
import { SOUND_PRESETS, playSoundPreset } from '../utils/audioSynthesizer';
import { triggerVibration } from '../utils/vibrationHelper';

export default function SettingsScreen({ settings, onUpdateSettings, onResetSettings, user, onSignOut }) {
  const {
    alertStyle,
    alertSound,
    themeMode,
    isHighContrast
  } = settings;

  const handleTestSound = (soundId) => {
    playSoundPreset(soundId);
    triggerVibration('tap');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'StopAhead User';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Manage your account profile, alerts, theme, and audio presets.
        </p>
      </div>

      {/* Account Profile Card */}
      {user && (
        <div className="quiet-card" style={{ border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(0, 229, 255, 0.05)' }}>
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
                  color: '#000',
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

      {/* Alert Style */}
      <div className="quiet-card">
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
          Alert Delivery
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
                  color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
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
                  background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.03)',
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
          Visual & Theme
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
          <span style={{ fontSize: '0.88rem' }}>High Contrast Mode</span>
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
