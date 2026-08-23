// BottomNav.jsx - Minimal bottom navigation bar
import React from 'react';
import { Home, MapPin, Navigation, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, onNavigate, hasActiveTrip }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
        id="nav-tab-home"
      >
        <Home size={19} className="nav-icon" />
        <span>Home</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'set-destination' ? 'active' : ''}`}
        onClick={() => onNavigate('set-destination')}
        id="nav-tab-destination"
      >
        <MapPin size={19} className="nav-icon" />
        <span>Set Stop</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'active-trip' ? 'active' : ''}`}
        onClick={() => onNavigate('active-trip')}
        id="nav-tab-trip"
      >
        <Navigation size={19} className="nav-icon" />
        <span>Active Trip</span>
        {hasActiveTrip && <span className="nav-badge-dot" />}
      </button>

      <button
        className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
        id="nav-tab-settings"
      >
        <Settings size={19} className="nav-icon" />
        <span>Settings</span>
      </button>
    </nav>
  );
}
