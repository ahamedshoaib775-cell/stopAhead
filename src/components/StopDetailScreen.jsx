// StopDetailScreen.jsx - Transit Stop Detail Page with Serving Routes & Nearby Stops
import React, { useState } from 'react';
import { ArrowLeft, Navigation, Bell, Heart, MapPin, Bus, Subtitles as Subways, Train, ChevronRight } from 'lucide-react';
import RouteBadge from './common/RouteBadge';
import { openGoogleMapsDirections } from '../utils/navigationHelper';

export default function StopDetailScreen({
  stop = { id: 'tbm-bus', name: 'Tambaram Bus Stand', walkTime: '2 min walk', distance: '150m', routes: ['21G', '500', '515', '19B'] },
  onNavigate,
  onSelectRoute
}) {
  const [isFavorited, setIsFavorited] = useState(false);

  const servingRoutes = [
    { id: '21G', title: 'Tambaram ↔ Broadway', frequency: 'Every 8 min', mode: 'bus' },
    { id: '500', title: 'Chengalpattu ↔ Broadway', frequency: 'Every 12 min', mode: 'bus' },
    { id: '515', title: 'Tambaram ↔ Mamallapuram', frequency: 'Every 15 min', mode: 'bus' },
    { id: '19B', title: 'Kelambakkam ↔ Saidapet', frequency: 'Every 10 min', mode: 'bus' }
  ];

  const nearbyStops = [
    { id: 'tbm-railway', name: 'Tambaram Railway Station', walkTime: '4 min walk', mode: 'suburban' },
    { id: 'chromepet-bus', name: 'Chromepet Bus Stop', walkTime: '8 min walk', mode: 'bus' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Back Button */}
      <button
        type="button"
        onClick={() => onNavigate && onNavigate('map')}
        style={{ background: 'none', border: 'none', color: '#025AED', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Map</span>
      </button>

      {/* Stop Thumbnail & Title Header Card */}
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
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#025AED', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} color="#025AED" />
              <span>TRANSIT STOP DETAILS</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '2px 0 0 0', letterSpacing: '-0.01em' }}>
              {stop.name}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
              {stop.walkTime} ({stop.distance || '150m'})
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFavorited(!isFavorited)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: isFavorited ? '#FEE2E2' : '#F8FAFC',
              border: isFavorited ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isFavorited ? '#DC2626' : '#64748B'
            }}
          >
            <Heart size={20} fill={isFavorited ? '#DC2626' : 'none'} />
          </button>
        </div>

        {/* Two Primary Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              openGoogleMapsDirections(null, null, stop.lat || 13.0232, stop.lng || 80.2238, stop.mode || 'bus', 'transit');
            }}
            style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', borderRadius: '14px', background: '#025AED', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: 'none', cursor: 'pointer' }}
          >
            <Navigation size={16} />
            <span>Get Directions</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate && onNavigate('set-alert')}
            style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', borderRadius: '14px', background: '#F1F5F9', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid #CBD5E1', cursor: 'pointer' }}
          >
            <Bell size={16} color="#025AED" />
            <span>Set Alert</span>
          </button>
        </div>
      </div>

      {/* Routes Serving This Stop Section */}
      <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
          Routes Serving This Stop ({servingRoutes.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {servingRoutes.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelectRoute && onSelectRoute(r.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 0.95rem',
                borderRadius: '16px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <RouteBadge routeNo={r.id} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>{r.title}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>{r.frequency}</div>
                </div>
              </div>

              <ChevronRight size={18} color="#94A3B8" />
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Section for Other Close-by Stops */}
      <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
          Nearby Stops
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {nearbyStops.map((ns) => (
            <div
              key={ns.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.95rem',
                borderRadius: '14px',
                background: '#F8FAFC',
                fontSize: '0.84rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <MapPin size={16} color="#025AED" />
                <div>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{ns.name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>{ns.walkTime}</div>
                </div>
              </div>

              <ChevronRight size={16} color="#94A3B8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
