// FavoritesScreen.jsx - Saved Places & Favorite Routes Tabs
import React, { useState } from 'react';
import { Heart, Plus, MapPin, Home, GraduationCap, Briefcase, Trash2, ArrowRight } from 'lucide-react';
import RouteBadge from './common/RouteBadge';

export default function FavoritesScreen({ onNavigate, onStartTrip }) {
  const [activeTab, setActiveTab] = useState('places'); // 'places' | 'routes'

  const [places, setPlaces] = useState([
    { id: 1, label: 'Home', icon: Home, address: 'Anna Nagar, Chennai', lat: 13.085, lng: 80.210 },
    { id: 2, label: 'College / University', icon: GraduationCap, address: 'Anna University, Guindy', lat: 13.010, lng: 80.235 },
    { id: 3, label: 'Work', icon: Briefcase, address: 'TIDEL Park, OMR, Chennai', lat: 12.989, lng: 80.248 }
  ]);

  const [routes, setRoutes] = useState([
    { id: '21G', title: 'Tambaram ↔ Broadway', operator: 'Chennai MTC', mode: 'bus' },
    { id: 'Blue Line', title: 'Wimco Nagar ↔ Airport', operator: 'CMRL Metro', mode: 'metro' },
    { id: '19B', title: 'Kelambakkam ↔ Saidapet', operator: 'Chennai MTC', mode: 'bus' }
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
            My Favorites
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '2px 0 0 0' }}>
            Saved places and favorite transit routes
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('search')}
          className="btn-primary"
          style={{ padding: '0.55rem 0.9rem', fontSize: '0.82rem', borderRadius: '14px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} />
          <span>Add New</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.4rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('places')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            background: activeTab === 'places' ? '#025AED' : 'transparent',
            color: activeTab === 'places' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          My Places ({places.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            background: activeTab === 'routes' ? '#025AED' : 'transparent',
            color: activeTab === 'routes' ? '#ffffff' : '#64748B',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Favorite Routes ({routes.length})
        </button>
      </div>

      {/* Places List */}
      {activeTab === 'places' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {places.map((place) => {
            const Icon = place.icon;
            return (
              <div
                key={place.id}
                className="glass-card glass-card-interactive"
                onClick={() => onNavigate && onNavigate('search')}
                style={{
                  padding: '1.1rem',
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(2, 90, 237, 0.08)', color: '#025AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} />
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>{place.label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '1px' }}>{place.address}</div>
                  </div>
                </div>

                <ArrowRight size={18} color="#025AED" />
              </div>
            );
          })}
        </div>
      )}

      {/* Routes List */}
      {activeTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {routes.map((route) => (
            <div
              key={route.id}
              className="glass-card glass-card-interactive"
              onClick={() => onNavigate && onNavigate('search')}
              style={{
                padding: '1.1rem',
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <RouteBadge routeNo={route.id} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}>{route.title}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '1px' }}>{route.operator}</div>
                </div>
              </div>

              <ArrowRight size={18} color="#025AED" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
