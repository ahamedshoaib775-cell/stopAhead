// BottomNav.jsx - 5-Tab Bar (Home, Search, Map, Alerts, Profile) with active tab accent highlighting
import React from 'react';
import { Home, Search, Map, Bell, User } from 'lucide-react';

export default function BottomNav({ activeTab, onNavigate, hasActiveAlerts }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: hasActiveAlerts },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="bottom-nav" style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.04)' }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id || (tab.id === 'search' && activeTab === 'set-destination') || (tab.id === 'profile' && (activeTab === 'settings' || activeTab === 'admin'));

        return (
          <button
            key={tab.id}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
            id={`nav-tab-${tab.id}`}
            style={{ color: isActive ? '#025AED' : '#64748B' }}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={20} className="nav-icon" color={isActive ? '#025AED' : '#64748B'} />
              {tab.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#16A34A'
                  }}
                />
              )}
            </div>
            <span style={{ fontWeight: isActive ? 800 : 600, fontSize: '0.72rem', marginTop: '2px' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
