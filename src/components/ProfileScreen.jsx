// ProfileScreen.jsx - User Profile, Settings List & Admin Access
import React from 'react';
import { User, ChevronRight, Bell, MapPin, Heart, History, Shield, Moon, HelpCircle, LogOut, Layers, CheckCircle2 } from 'lucide-react';
import StatusBadge from './common/StatusBadge';

export default function ProfileScreen({
  user,
  onSignOut,
  onNavigate
}) {
  const userName = user?.email ? user.email.split('@')[0] : 'Commuter';
  const userEmail = user?.email || 'commuter@stopahead.in';
  const isAdmin = true; // Admin role unlocked for admin panel access

  const settingsRows = [
    { id: 'admin', label: 'Admin Transit Panel', icon: Layers, badge: 'Admin', color: '#025AED', action: () => onNavigate && onNavigate('admin') },
    { id: 'account', label: 'Account Settings', icon: User, action: () => {} },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell, action: () => {} },
    { id: 'location', label: 'Location Preferences', icon: MapPin, action: () => {} },
    { id: 'places', label: 'Saved Places', icon: Heart, action: () => onNavigate && onNavigate('favorites') },
    { id: 'alerts', label: 'My Alerts', icon: Bell, action: () => onNavigate && onNavigate('alerts') },
    { id: 'history', label: 'Recent Searches & Trips', icon: History, action: () => {} },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, action: () => {} }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
          Profile & Settings
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
          Manage your account preferences and saved transit alerts
        </p>
      </div>

      {/* User Profile Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #025AED 0%, #3B82F6 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(2, 90, 237, 0.25)'
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A' }}>{userName}</div>
            <StatusBadge status="Active" label="Verified" />
          </div>
          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '1px' }}>{userEmail}</div>
        </div>
      </div>

      {/* Settings Rows */}
      <div
        className="glass-card"
        style={{
          padding: '0.5rem',
          background: '#FFFFFF',
          borderRadius: '22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {settingsRows.map((row, idx) => {
          const Icon = row.icon;
          return (
            <div
              key={row.id}
              onClick={row.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                borderBottom: idx < settingsRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: row.color ? 'rgba(2, 90, 237, 0.08)' : '#F8FAFC', color: row.color || '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0F172A' }}>{row.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {row.badge && (
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#025AED', color: '#ffffff', fontSize: '0.7rem', fontWeight: 800 }}>
                    {row.badge}
                  </span>
                )}
                <ChevronRight size={18} color="#94A3B8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Logout Destructive Button */}
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontWeight: 800,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      )}
    </div>
  );
}
