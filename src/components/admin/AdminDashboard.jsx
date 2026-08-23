// AdminDashboard.jsx - Main Transit Data Administration Dashboard
import React, { useState } from 'react';
import { Layers, FileArchive, TrendingUp, Building2, MapPin, Navigation, ArrowUpRight, ArrowLeft } from 'lucide-react';
import AdminRoutesTable from './AdminRoutesTable';
import GTFSImportDropzone from './GTFSImportDropzone';

export default function AdminDashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'routes' | 'gtfs'

  const summaryCards = [
    { label: 'AGENCIES', count: '3', delta: '+1 this month', icon: Building2, color: '#025AED', bg: 'rgba(2, 90, 237, 0.08)' },
    { label: 'ROUTES', count: '168', delta: '+14 this month', icon: Layers, color: '#16A34A', bg: 'rgba(22, 163, 74, 0.08)' },
    { label: 'STOPS', count: '1,370', delta: '+85 this month', icon: MapPin, color: '#0D9488', bg: 'rgba(13, 148, 136, 0.08)' },
    { label: 'TRIPS', count: '4,820', delta: '+320 this month', icon: Navigation, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Admin Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('profile')}
            style={{ background: 'none', border: 'none', color: '#025AED', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.2rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Profile</span>
          </button>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
            Transit Admin Dashboard
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
            Maintain transit agencies, GTFS feeds, routes, and stop databases
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: '1.1rem',
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <ArrowUpRight size={12} />
                  {card.delta}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {card.count}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginTop: '2px' }}>
                  {card.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Tab Row */}
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
          onClick={() => setActiveTab('routes')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '12px',
            background: activeTab === 'routes' ? '#025AED' : 'transparent',
            color: activeTab === 'routes' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Routes Table
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gtfs')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '12px',
            background: activeTab === 'gtfs' ? '#025AED' : 'transparent',
            color: activeTab === 'gtfs' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          GTFS Feed Import
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Data Trend Chart Card */}
          <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} color="#025AED" />
              <span>Transit Network Expansion Trend</span>
            </div>

            {/* SVG Trend Chart */}
            <div style={{ width: '100%', height: '140px' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#025AED" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#025AED" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,90 Q80,70 160,50 T320,30 T400,10 L400,120 L0,120 Z" fill="url(#chartGrad)" />
                <path d="M0,90 Q80,70 160,50 T320,30 T400,10" fill="none" stroke="#025AED" strokeWidth="3" />
                <circle cx="160" cy="50" r="5" fill="#025AED" />
                <circle cx="320" cy="30" r="5" fill="#025AED" />
                <circle cx="400" cy="10" r="5" fill="#16A34A" />
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '0.5rem' }}>
              <span>Jan 2026</span>
              <span>Mar 2026</span>
              <span>May 2026</span>
              <span>Aug 2026</span>
            </div>
          </div>

          <GTFSImportDropzone />
        </div>
      )}

      {activeTab === 'routes' && <AdminRoutesTable />}
      {activeTab === 'gtfs' && <GTFSImportDropzone />}
    </div>
  );
}
