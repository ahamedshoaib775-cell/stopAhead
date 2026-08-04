// StopReportModal.jsx - Crowdsourced Stop Location Accuracy Flagging Modal
import React, { useState } from 'react';
import { Flag, CheckCircle2, X } from 'lucide-react';
import { createStopReport } from '../utils/dbService';

export default function StopReportModal({ stopName, onClose }) {
  const [issueType, setIssueType] = useState('incorrect_location');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createStopReport({
      stopName: stopName || 'Unknown Stop',
      issueType,
      details: details.trim()
    });
    setSubmitted(true);
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
          maxWidth: '400px',
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
          <Flag size={24} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Flag Stop Accuracy</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Help improve OpenStreetMap stop accuracy
            </div>
          </div>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem' }}>Report Submitted!</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Thank you for helping improve transit stop data for the community.
            </div>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Flagging: {stopName || 'Selected Stop'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { id: 'incorrect_location', label: 'Incorrect Map Location' },
                { id: 'missing_stop', label: 'Stop No Longer Exists' },
                { id: 'wrong_name', label: 'Incorrect Stop Name' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIssueType(opt.id)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: issueType === opt.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                    color: issueType === opt.id ? '#ffffff' : 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Additional details (optional)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'none'
              }}
            />

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Submit Flag Report
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
