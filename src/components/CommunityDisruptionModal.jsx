// CommunityDisruptionModal.jsx - Real-time Community Delay & Disruption Reporting
import React, { useState } from 'react';
import { AlertCircle, ThumbsUp, Plus, X, Radio } from 'lucide-react';
import { createDelayReport, upvoteDelayReport } from '../utils/dbService';

export default function CommunityDisruptionModal({ activeTrip, reports = [], onRefreshReports, onClose }) {
  const [issueType, setIssueType] = useState('bus_delayed');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stopName = activeTrip?.destinationStop?.name || 'General Route';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createDelayReport({
        stopName,
        routeName: activeTrip?.route?.name || 'Commute Route',
        issueType,
        description: description.trim() || 'Reported delay on route'
      });
      setDescription('');
      if (onRefreshReports) onRefreshReports();
    } catch (err) {
      console.warn('Report submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (reportId) => {
    await upvoteDelayReport(reportId);
    if (onRefreshReports) onRefreshReports();
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
          maxWidth: '440px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
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
          <AlertCircle size={24} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Community Disruption Hub</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Real-time crowdsourced transit delay reports
            </div>
          </div>
        </div>

        {/* Submit New Disruption Report */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Report Issue on {stopName}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'bus_delayed', label: 'Vehicle Delayed' },
              { id: 'traffic_heavy', label: 'Heavy Traffic' },
              { id: 'route_diverted', label: 'Route Diverted' },
              { id: 'crowded_stop', label: 'Station Crowded' }
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setIssueType(type.id)}
                style={{
                  padding: '0.6rem 0.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: issueType === type.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                  color: issueType === type.id ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Optional details (e.g. 15 min delay at main stand)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '0.75rem' }}>
            <Plus size={16} />
            <span>Post Disruption Update</span>
          </button>
        </form>

        {/* Recent Live Community Reports Feed */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Radio size={12} color="var(--accent)" />
            <span>Live Reports (&lt; 60 min old)</span>
          </div>

          {reports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {r.issue_type.replace('_', ' ').toUpperCase()} • {r.stop_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {r.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpvote(r.id)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(2, 90, 237, 0.15)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer'
                    }}
                  >
                    <ThumbsUp size={12} />
                    <span>{r.helpful_votes || 1}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              No active disruptions reported on this route in the last hour.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
