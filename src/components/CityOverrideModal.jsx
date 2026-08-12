// CityOverrideModal.jsx - Manual city selection and location override popover
import React, { useState } from 'react';
import { MapPin, Search, Navigation, X } from 'lucide-react';
import { geocodeCity } from '../utils/googleMapsService';

const POPULAR_CITIES = ['Chennai', 'New York', 'London', 'Tokyo', 'San Francisco', 'Mumbai'];

export default function CityOverrideModal({ currentCity, onSelectCity, onUseGps, onClose }) {
  const [cityInput, setCityInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = cityInput.trim();
    if (!query) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const geo = await geocodeCity(query);
      if (geo) {
        onSelectCity({
          name: geo.name,
          lat: geo.lat,
          lng: geo.lng,
          isManual: true
        });
      } else {
        setErrorMsg(`Could not find city "${query}". Please check spelling.`);
      }
    } catch (err) {
      setErrorMsg('Failed to look up city location. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = async (cityName) => {
    setCityInput(cityName);
    setIsLoading(true);
    setErrorMsg('');
    try {
      const geo = await geocodeCity(cityName);
      if (geo) {
        onSelectCity({
          name: geo.name,
          lat: geo.lat,
          lng: geo.lng,
          isManual: true
        });
      }
    } catch (err) {
      setErrorMsg('City lookup error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="quiet-card"
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-subtle)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <MapPin size={22} color="var(--accent)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Set Search Location</h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Search results will be biased near this city. Currently set to: <strong style={{ color: 'var(--accent)' }}>{currentCity || 'Default'}</strong>
        </p>

        {/* City Input Form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              placeholder="Enter city (e.g. Chennai, London)..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.65rem 0.65rem 2.2rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !cityInput.trim()}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading || !cityInput.trim() ? 0.6 : 1
            }}
          >
            {isLoading ? 'Searching...' : 'Apply'}
          </button>
        </form>

        {errorMsg && (
          <div style={{ fontSize: '0.78rem', color: '#ff5252', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Quick Popular Cities */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Popular Cities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleQuickSelect(city)}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: 'var(--radius-full)',
                  background: currentCity === city ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: currentCity === city ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  color: currentCity === city ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Use Auto GPS Location Option */}
        {onUseGps && (
          <button
            onClick={() => {
              onUseGps();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '0.7rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Navigation size={16} />
            <span>Use Auto-Detected GPS Location</span>
          </button>
        )}
      </div>
    </div>
  );
}
