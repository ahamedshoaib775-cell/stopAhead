// RouteDetailScreen.jsx - Structured Route Detail Screen (Overview, Stops, Timings, Map tabs)
import React, { useState } from 'react';
import { ArrowLeft, Clock, MapPin, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import RouteBadge from './common/RouteBadge';
import StatusBadge from './common/StatusBadge';

export default function RouteDetailScreen({
  routeNo = '21G',
  routeName = 'Tambaram ↔ Broadway',
  onNavigate,
  onSelectStop
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'stops' | 'timings'

  const stopsList = [
    { id: 1, name: 'Tambaram Bus Stand', time: '00:00' },
    { id: 2, name: 'Chromepet Metro / Bus Stop', time: '+08 min' },
    { id: 3, name: 'Pallavaram', time: '+14 min' },
    { id: 4, name: 'Airport Metro Station', time: '+22 min' },
    { id: 5, name: 'Guindy Transit Hub', time: '+34 min' },
    { id: 6, name: 'Saidapet Signal', time: '+42 min' },
    { id: 7, name: 'Nandanam Metro', time: '+48 min' },
    { id: 8, name: 'T. Nagar Bus Terminus', time: '+55 min' },
    { id: 9, name: 'Chennai Central Railway Station', time: '+70 min' },
    { id: 10, name: 'Broadway Bus Terminus', time: '+80 min' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Back Button */}
      <button
        type="button"
        onClick={() => onNavigate && onNavigate('search')}
        style={{ background: 'none', border: 'none', color: '#025AED', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Route Search</span>
      </button>

      {/* Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <RouteBadge routeNo={routeNo} style={{ fontSize: '0.9rem', padding: '0.3rem 0.75rem' }} />
            <StatusBadge status="Active" label="Daily Service" />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
            {routeName}
          </h2>
          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
            Chennai MTC Metropolitan Transport Corporation
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.4rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '12px',
            background: activeTab === 'overview' ? '#025AED' : 'transparent',
            color: activeTab === 'overview' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stops')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '12px',
            background: activeTab === 'stops' ? '#025AED' : 'transparent',
            color: activeTab === 'stops' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Stops ({stopsList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timings')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '12px',
            background: activeTab === 'timings' ? '#025AED' : 'transparent',
            color: activeTab === 'timings' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Timings
        </button>
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Route Number</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{routeNo}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Operator</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>Chennai MTC</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Start Point</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>Tambaram</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>End Point</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>Broadway</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Total Distance</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>28.5 km</div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Stop Count</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{stopsList.length} stops</div>
          </div>
        </div>
      )}

      {/* Stops Tab Content (Numbered Vertical Timeline List) */}
      {activeTab === 'stops' && (
        <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {stopsList.map((st, idx) => (
            <div
              key={st.id}
              onClick={() => onSelectStop && onSelectStop(st.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.95rem',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#025AED', color: '#ffffff', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{st.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{st.time}</div>
                </div>
              </div>

              <ChevronRight size={18} color="#94A3B8" />
            </div>
          ))}
        </div>
      )}

      {/* Timings Tab Content */}
      {activeTab === 'timings' && (
        <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>Daily Operating Schedule</div>
          <div style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
            • First Bus: 05:00 AM from Tambaram<br />
            • Last Bus: 11:15 PM from Tambaram<br />
            • Peak Hours Frequency: Every 6–8 min<br />
            • Non-Peak Hours Frequency: Every 12–15 min
          </div>
        </div>
      )}
    </div>
  );
}
