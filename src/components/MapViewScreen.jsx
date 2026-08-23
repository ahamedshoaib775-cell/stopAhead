// MapViewScreen.jsx - Clean Route & Stop Directions Explorer with Google Maps Deep Link Handoff
import React, { useState } from 'react';
import { Search, MapPin, Navigation, Bus, Subtitles as Subways, Train, ChevronRight } from 'lucide-react';
import RouteBadge from './common/RouteBadge';
import { openGoogleMapsDirections } from '../utils/navigationHelper';

export default function MapViewScreen({
  userLocation,
  onNavigate,
  onSelectStop
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filterChips = [
    { id: 'all', label: 'All Stops', icon: '✨' },
    { id: 'bus', label: 'Bus Stops', icon: '🚌' },
    { id: 'metro', label: 'Metro', icon: '🚇' },
    { id: 'train', label: 'Train Stations', icon: '🚆' }
  ];

  const exploreStops = [
    {
      id: 'tbm-bus',
      name: 'Tambaram Bus Stand',
      lat: 12.9249,
      lng: 80.1000,
      walkDistance: '150m (2 min walk)',
      mode: 'bus',
      routes: ['21G', '500', '515', '19B']
    },
    {
      id: 'saidapet-hub',
      name: 'Saidapet Metro & Bus Hub',
      lat: 13.0232,
      lng: 80.2238,
      walkDistance: '400m (5 min walk)',
      mode: 'metro',
      routes: ['Blue Line', '19B', '5C', '14M']
    },
    {
      id: 'guindy-railway',
      name: 'Guindy Railway & Bus Terminus',
      lat: 13.0067,
      lng: 80.2020,
      walkDistance: '650m (8 min walk)',
      mode: 'train',
      routes: ['Suburban South', '21G', '47A']
    },
    {
      id: 'central-station',
      name: 'Chennai Central Railway Station',
      lat: 13.0827,
      lng: 80.2707,
      walkDistance: '1.2 km (14 min walk)',
      mode: 'train',
      routes: ['Blue Line', 'Green Line', 'Suburban West']
    }
  ];

  const filteredStops = exploreStops.filter((s) => {
    if (selectedFilter !== 'all' && s.mode !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.routes.some((r) => r.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', color: '#0F172A' }}>
      {/* Header & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          Explore Route Directions 🗺️
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1rem',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
          }}
        >
          <Search size={18} color="#025AED" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stops, stations, or route numbers..."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setSelectedFilter(chip.id)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                background: selectedFilter === chip.id ? '#025AED' : '#FFFFFF',
                color: selectedFilter === chip.id ? '#FFFFFF' : '#475569',
                border: selectedFilter === chip.id ? '1px solid #025AED' : '1px solid #CBD5E1',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Google Maps Handoff Overview Card */}
      <div
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #025AED 0%, #0042B3 100%)',
          color: '#ffffff',
          padding: '1.25rem',
          boxShadow: '0 8px 25px rgba(2, 90, 237, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 700 }}>
                Live Navigation Handoff
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Google Maps Turn-by-Turn
              </div>
            </div>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.84rem', opacity: 0.9, lineHeight: 1.45 }}>
          One-tap native navigation with zero API keys required. StopAhead handles stop alerts and bus route matching in the background!
        </p>

        <button
          type="button"
          onClick={() => {
            openGoogleMapsDirections(
              userLocation?.lat,
              userLocation?.lng,
              13.0232,
              80.2238,
              'bus',
              'transit'
            );
          }}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '12px',
            background: '#ffffff',
            color: '#025AED',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
          }}
        >
          <Navigation size={18} />
          Open Google Maps Directions
        </button>
      </div>

      {/* Explore Transit Stops List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Nearby Transit Hubs & Directions ({filteredStops.length})
        </div>

        {filteredStops.map((stop) => (
          <div
            key={stop.id}
            style={{
              padding: '1rem',
              borderRadius: '18px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  {stop.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                  📍 {stop.walkDistance}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  openGoogleMapsDirections(
                    userLocation?.lat,
                    userLocation?.lng,
                    stop.lat,
                    stop.lng,
                    stop.mode,
                    'transit'
                  );
                }}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(2, 90, 237, 0.08)',
                  color: '#025AED',
                  border: '1px solid rgba(2, 90, 237, 0.2)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Navigation size={14} />
                Get Directions
              </button>
            </div>

            {/* Serving Route Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Serving:</span>
              {stop.routes.map((r) => (
                <RouteBadge key={r} routeNo={r} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
