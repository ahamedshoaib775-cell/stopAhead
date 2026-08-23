// MyAlertsScreen.jsx - Transit Proximity & Schedule Alerts Manager
import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';
import RouteBadge from './common/RouteBadge';
import StatusBadge from './common/StatusBadge';

export default function MyAlertsScreen({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  const [alerts, setAlerts] = useState([
    { id: 1, routeNo: '21G', title: 'Tambaram ↔ Broadway', trigger: 'When bus is approaching (500m)', frequency: 'Every day', enabled: true, isHistory: false },
    { id: 2, routeNo: 'Blue Line', title: 'Wimco Nagar ↔ Airport', trigger: 'Before departure (5 min)', frequency: 'Weekdays', enabled: true, isHistory: false },
    { id: 3, routeNo: '19B', title: 'Kelambakkam ↔ Saidapet', trigger: 'When bus arrives at stop', frequency: 'Weekdays', enabled: false, isHistory: false },
    { id: 4, routeNo: '500', title: 'Chengalpattu ↔ Broadway', trigger: 'Arrived at stop', frequency: 'Yesterday', enabled: false, isHistory: true }
  ]);

  const toggleAlert = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const deleteAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const filteredAlerts = alerts.filter((a) =>
    activeTab === 'active' ? !a.isHistory : a.isHistory
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
            My Transit Alerts
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
            Proximity alarms & arrival notifications
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('set-alert')}
          className="btn-primary"
          style={{ padding: '0.55rem 0.9rem', fontSize: '0.82rem', borderRadius: '14px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} />
          <span>Add Alert</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.4rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            background: activeTab === 'active' ? '#025AED' : 'transparent',
            color: activeTab === 'active' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Active Alerts ({alerts.filter((a) => !a.isHistory).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            background: activeTab === 'history' ? '#025AED' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          History ({alerts.filter((a) => a.isHistory).length})
        </button>
      </div>

      {/* Alerts Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="glass-card"
            style={{
              padding: '1.1rem',
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <RouteBadge routeNo={alert.routeNo} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>{alert.title}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '1px' }}>{alert.frequency}</div>
                </div>
              </div>

              {/* Enable / Disable Toggle */}
              {!alert.isHistory && (
                <button
                  type="button"
                  onClick={() => toggleAlert(alert.id)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '999px',
                    background: alert.enabled ? '#025AED' : '#CBD5E1',
                    border: 'none',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: alert.enabled ? '23px' : '3px',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', borderRadius: '12px', background: '#F8FAFC', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0F172A', fontWeight: 700 }}>
                <Bell size={14} color="#025AED" />
                <span>{alert.trigger}</span>
              </div>

              <button
                type="button"
                onClick={() => deleteAlert(alert.id)}
                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                title="Delete alert"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Alert Bottom CTA */}
      <button
        type="button"
        onClick={() => onNavigate && onNavigate('set-alert')}
        className="btn-primary"
        style={{
          width: '100%',
          padding: '0.85rem',
          fontSize: '0.92rem',
          borderRadius: '16px',
          background: '#025AED',
          color: '#ffffff',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <Plus size={18} />
        <span>+ Add New Alert</span>
      </button>
    </div>
  );
}
