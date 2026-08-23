// RouteSearchScreen.jsx - Search & Route Results Page with Filters & Transfer Info
import React, { useState } from 'react';
import { Search, Filter, History, TrendingUp, Bus, Subtitles as Subways, Train, ChevronRight, ArrowRight } from 'lucide-react';
import RouteBadge from './common/RouteBadge';

export default function RouteSearchScreen({ onNavigate, onSelectRoute }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'bus' | 'metro' | 'train' | 'suburban'

  const filterTabs = [
    { id: 'all', label: 'All', icon: '✨' },
    { id: 'bus', label: 'Bus', icon: '🚌' },
    { id: 'metro', label: 'Metro', icon: '🚇' },
    { id: 'train', label: 'Train', icon: '🚆' },
    { id: 'suburban', label: 'Local Train', icon: '🚉' }
  ];

  const recentSearches = ['Tambaram to Broadway', 'Saidapet to Kelambakkam', 'Guindy to Airport Metro'];
  const popularSearches = ['Chennai Central Metro', 'T. Nagar Bus Terminus', 'Tambaram Railway Station'];

  const routeResults = [
    { id: '21G', name: 'Tambaram ↔ Broadway', mode: 'bus', duration: '48 min', transfer: 'No interchange', fare: '₹22', stopsCount: 38 },
    { id: 'Blue Line', name: 'Wimco Nagar ↔ Airport', mode: 'metro', duration: '32 min', transfer: 'Direct Metro', fare: '₹40', stopsCount: 26 },
    { id: '19B', name: 'Kelambakkam ↔ Saidapet', mode: 'bus', duration: '55 min', transfer: 'Walk 4 min at Guindy', fare: '₹25', stopsCount: 42 },
    { id: '500', name: 'Chengalpattu ↔ Broadway', mode: 'bus', duration: '65 min', transfer: 'No interchange', fare: '₹35', stopsCount: 48 },
    { id: 'Green Line', name: 'Chennai Central ↔ St. Thomas Mount', mode: 'metro', duration: '24 min', transfer: 'Direct Metro', fare: '₹30', stopsCount: 17 }
  ];

  const filteredResults = routeResults.filter((r) => {
    const matchesSearch = !searchQuery || r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || r.mode === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: '#0F172A' }}>
      {/* Search Input Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#0F172A' }}>
          Find Routes & Schedules
        </h2>

        <div
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '2px solid #025AED',
            boxShadow: '0 4px 20px rgba(2, 90, 237, 0.1)'
          }}
        >
          <Search size={20} color="#025AED" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search route no, station, or destination..."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.96rem', color: '#0F172A' }}
            autoFocus
          />
        </div>
      </div>

      {/* Mode Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFilter(tab.id)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              background: selectedFilter === tab.id ? '#025AED' : '#FFFFFF',
              color: selectedFilter === tab.id ? '#FFFFFF' : '#475569',
              border: selectedFilter === tab.id ? '1px solid #025AED' : '1px solid #CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Empty State / Recent & Popular Searches */}
      {!searchQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Recent Searches */}
          <div className="glass-card" style={{ padding: '1.1rem', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <History size={14} color="#025AED" />
              <span>RECENT SEARCHES</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentSearches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSearchQuery(item.split(' ')[0])}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', borderRadius: '12px', background: '#F8FAFC', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                >
                  <span>{item}</span>
                  <ArrowRight size={14} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>

          {/* Popular Searches */}
          <div className="glass-card" style={{ padding: '1.1rem', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <TrendingUp size={14} color="#16A34A" />
              <span>POPULAR DESTINATIONS</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {popularSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSearchQuery(item)}
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '12px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Route Results ({filteredResults.length})
        </div>

        {filteredResults.map((r) => (
          <div
            key={r.id}
            className="glass-card glass-card-interactive"
            onClick={() => onSelectRoute && onSelectRoute(r.id)}
            style={{
              padding: '1.1rem',
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <RouteBadge routeNo={r.id} />
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>{r.name}</div>
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#025AED' }}>{r.fare}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748B', fontWeight: 600, paddingTop: '0.35rem', borderTop: '1px solid #F1F5F9' }}>
              <span>Total Time: ~{r.duration}</span>
              <span>{r.transfer}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Routes Pagination Link */}
      <button
        type="button"
        style={{ width: '100%', padding: '0.75rem', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#025AED', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer', textAlign: 'center' }}
      >
        Load more routes...
      </button>
    </div>
  );
}
