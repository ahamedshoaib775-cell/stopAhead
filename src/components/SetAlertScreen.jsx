// SetAlertScreen.jsx - Proximity Alarm & Schedule Notification Configurator
import React, { useState } from 'react';
import { Bell, ArrowLeft, CheckCircle2, Sliders, Calendar } from 'lucide-react';
import RouteBadge from './common/RouteBadge';

export default function SetAlertScreen({ onNavigate, onSaveAlert }) {
  const [selectedRoute, setSelectedRoute] = useState('21G');
  const [selectedStop, setSelectedStop] = useState('Tambaram Bus Stand');
  const [triggerApproaching, setTriggerApproaching] = useState(true);
  const [triggerArrives, setTriggerArrives] = useState(true);
  const [triggerDeparture, setTriggerDeparture] = useState(false);
  const [frequency, setFrequency] = useState('Every day');
  const [created, setCreated] = useState(false);

  const routeOptions = [
    { id: '21G', name: '21G (Tambaram ↔ Broadway)' },
    { id: '19B', name: '19B (Kelambakkam ↔ Saidapet)' },
    { id: '500', name: '500 (Chengalpattu ↔ Broadway)' },
    { id: 'Blue Line', name: 'Blue Line (Metro Wimco Nagar ↔ Airport)' }
  ];

  const stopOptions = [
    'Tambaram Bus Stand',
    'Chromepet Metro / Bus Stop',
    'Guindy Transit Hub',
    'Saidapet Bus Stop',
    'Chennai Central Railway Station'
  ];

  const handleCreate = (e) => {
    e.preventDefault();
    setCreated(true);
    setTimeout(() => {
      if (onNavigate) onNavigate('alerts');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Header */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('alerts')}
          style={{ background: 'none', border: 'none', color: '#025AED', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Alerts</span>
        </button>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
          Set Transit Alert
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
          Configure proximity alarms and schedule notifications
        </p>
      </div>

      {created ? (
        <div className="glass-card" style={{ padding: '2.5rem 1.5rem', background: '#FFFFFF', borderRadius: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
          <CheckCircle2 size={48} color="#16A34A" />
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A' }}>Alert Created Successfully!</div>
          <div style={{ fontSize: '0.84rem', color: '#64748B' }}>
            We will alert you when {selectedRoute} reaches {selectedStop}.
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Target Route & Stop Selector Card */}
          <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
              <Bell size={18} color="#025AED" />
              <span>Target Route & Stop</span>
            </div>

            {/* Select Route */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Select Transit Route
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <RouteBadge routeNo={selectedRoute} />
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', outline: 'none' }}
                >
                  {routeOptions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Stop */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                Select Target Station / Stop
              </label>
              <select
                value={selectedStop}
                onChange={(e) => setSelectedStop(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', outline: 'none' }}
              >
                {stopOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger Options Toggles Card */}
          <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
              <Sliders size={18} color="#025AED" />
              <span>Notification Trigger Options</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '14px', background: '#F8FAFC', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>When bus/train is approaching (500m)</span>
              <input type="checkbox" checked={triggerApproaching} onChange={(e) => setTriggerApproaching(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#025AED' }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '14px', background: '#F8FAFC', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>When bus/train arrives at stop</span>
              <input type="checkbox" checked={triggerArrives} onChange={(e) => setTriggerArrives(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#025AED' }} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '14px', background: '#F8FAFC', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Before departure (5 min)</span>
              <input type="checkbox" checked={triggerDeparture} onChange={(e) => setTriggerDeparture(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#025AED' }} />
            </label>
          </div>

          {/* Repeat Frequency */}
          <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
              <Calendar size={16} color="#025AED" />
              <span>Repeat Frequency</span>
            </div>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', outline: 'none' }}
            >
              <option value="Every day">Every day</option>
              <option value="Weekdays (Mon-Fri)">Weekdays (Mon-Fri)</option>
              <option value="Weekends (Sat-Sun)">Weekends (Sat-Sun)</option>
              <option value="One time only">One time only</option>
            </select>
          </div>

          <button
            type="submit"
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
            <Bell size={18} />
            <span>Create Alert</span>
          </button>
        </form>
      )}
    </div>
  );
}
