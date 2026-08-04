// ShareTripModal.jsx - Live Read-Only Trip Sharing Modal
import React, { useState } from 'react';
import { Share2, Copy, Check, X, Compass, ExternalLink } from 'lucide-react';

export default function ShareTripModal({ activeTrip, userPosition, userLocation, onClose }) {
  const [copied, setCopied] = useState(false);

  const destName = activeTrip?.destinationStop?.name || 'Destination';
  const stopsRemaining = activeTrip?.stopsRemaining || 1;
  const timeRemainingMins = Math.ceil(activeTrip?.timeRemainingMins || 5);
  const lat = userPosition?.lat || userLocation?.lat || activeTrip?.destinationStop?.lat || 13.0827;
  const lng = userPosition?.lng || userLocation?.lng || activeTrip?.destinationStop?.lng || 80.2707;

  const shareUrl = `https://maps.google.com/?q=${lat},${lng}`;
  const shareText = `Track my live StopAhead journey to ${destName}! ETA: ~${timeRemainingMins} mins (${stopsRemaining} stops left). Live map: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `StopAhead Live Trip to ${destName}`,
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4, 9, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="quiet-card"
        style={{
          maxWidth: '420px',
          width: '100%',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-subtle)',
          padding: '1.5rem',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: 'var(--accent)' }}>
          <Share2 size={24} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Share Live Journey</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Let family/friends track your arrival in real-time
            </div>
          </div>
        </div>

        {/* Read-Only Live Trip Summary Card */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(2, 90, 237, 0.08)',
            border: '1px solid rgba(2, 90, 237, 0.25)',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            DESTINATION STATION
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{destName}</div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span><strong>{stopsRemaining}</strong> stops remaining</span>
            <span><strong>~{timeRemainingMins}</strong> min ETA</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {navigator.share && (
            <button className="btn-primary" onClick={handleWebShare} style={{ width: '100%' }}>
              <Share2 size={18} />
              <span>Share via WhatsApp / Apps</span>
            </button>
          )}

          <button className="btn-secondary" onClick={handleCopyLink} style={{ width: '100%' }}>
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Live Link Copied!' : 'Copy Live Tracking Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
