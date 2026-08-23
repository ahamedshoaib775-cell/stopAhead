// HomeScreen.jsx - Redesigned Clean Light Home Screen connected to Set Destination Engine
import React, { useState } from 'react';
import { Search, Navigation, MapPin, ArrowRight, User, Bus, Subtitles as Subways, Train, Layers, Compass, CheckCircle2 } from 'lucide-react';
import RouteBadge from './common/RouteBadge';

export default function HomeScreen({
  userLocation,
  activeTrip,
  onNavigate,
  onStartTrip,
  user
}) {
  const [fromLocation, setFromLocation] = useState(userLocation?.cityName || 'Current Location');
  const [toLocation, setToLocation] = useState('');

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.email ? user.email.split('@')[0] : 'Commuter';

  const modeButtons = [
    { id: 'bus', label: 'Bus', icon: '🚌', count: '154 routes' },
    { id: 'metro', label: 'Metro', icon: '🚇', count: '2 lines' },
    { id: 'train', label: 'Train', icon: '🚆', count: 'Express' },
    { id: 'suburban', label: 'Local Train', icon: '🚉', count: '12 lines' }
  ];

  const nearbyStops = [
    { id: 1, name: 'Tambaram Bus Stand', walkTime: '2 min walk', distance: '150m', routes: ['21G', '500', '515', '19B'] },
    { id: 2, name: 'Chromepet Metro / Bus Station', walkTime: '6 min walk', distance: '450m', routes: ['Blue Line', '21G', '70'] },
    { id: 3, name: 'Guindy Railway & Transit Hub', walkTime: '10 min walk', distance: '800m', routes: ['MS-TBM', 'Blue Line', '19B'] }
  ];

  const handleFindRoute = (e) => {
    if (e) e.preventDefault();
    if (onNavigate) {
      onNavigate('set-destination');
    }
  };

  const handleModeClick = (modeId) => {
    try {
      localStorage.setItem('stopahead_last_transit_mode', modeId);
    } catch (err) {}
    if (onNavigate) {
      onNavigate('set-destination');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Greeting Header with Profile Avatar Top-Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#025AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STOPAHEAD LIVE TRANSIT
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0', letterSpacing: '-0.02em' }}>
            {getTimeGreeting()}, {userName} 👋
          </h2>
        </div>

        {/* Profile Avatar Top-Right */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('profile')}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #025AED 0%, #3B82F6 100%)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(2, 90, 237, 0.25)'
          }}
          title="Profile & Settings"
        >
          {userName.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Prominent "Where do you want to go?" Card */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', letterSpacing: '-0.01em' }}>
          Where do you want to go?
        </div>

        <form onSubmit={handleFindRoute} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* From Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.95rem', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <MapPin size={18} color="#16A34A" />
            <input
              type="text"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              placeholder="From: Current Location"
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}
            />
          </div>

          {/* To Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.95rem', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <Navigation size={18} color="#025AED" />
            <input
              type="text"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              onFocus={() => onNavigate && onNavigate('set-destination')}
              placeholder="To: Enter destination station or place..."
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}
            />
          </div>

          {/* Find Route Primary Button */}
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
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(2, 90, 237, 0.25)'
            }}
          >
            <span>Find Route</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {/* Active Trip Quick Access Card (If active trip is running) */}
      {activeTrip && (
        <div
          className="glass-card glass-card-interactive"
          onClick={() => onNavigate && onNavigate('active-trip')}
          style={{
            padding: '1.1rem',
            background: 'linear-gradient(135deg, rgba(2, 90, 237, 0.08) 0%, #FFFFFF 100%)',
            border: '2px solid #025AED',
            borderRadius: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#025AED', textTransform: 'uppercase' }}>TRIP IN PROGRESS</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                {activeTrip.destinationStop?.name || 'Live Route Tracking'}
              </div>
            </div>
          </div>

          <ArrowRight size={18} color="#025AED" />
        </div>
      )}

      {/* Quick Search 4-Mode Row */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
          EXPLORE TRANSIT MODES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.55rem' }}>
          {modeButtons.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeClick(m.id)}
              style={{
                padding: '0.85rem 0.4rem',
                borderRadius: '18px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>{m.label}</span>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>{m.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Stops List */}
      <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Nearby Stops</span>
          <span style={{ fontSize: '0.78rem', color: '#025AED', fontWeight: 700, cursor: 'pointer' }} onClick={() => onNavigate && onNavigate('map')}>View Map ➔</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {nearbyStops.map((stop) => (
            <div
              key={stop.id}
              onClick={() => onNavigate && onNavigate('set-destination')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                padding: '0.85rem 0.95rem',
                borderRadius: '18px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>{stop.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>{stop.walkTime}</div>
              </div>

              {/* Route Badges Served at That Stop */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {stop.routes.map((r) => (
                  <RouteBadge key={r} routeNo={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
