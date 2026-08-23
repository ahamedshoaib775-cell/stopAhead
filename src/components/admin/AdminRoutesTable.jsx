// AdminRoutesTable.jsx - Filterable Transit Routes Management Table
import React, { useState } from 'react';
import { Search, Plus, Filter, Bus, Subtitles as Subways, Train, Layers } from 'lucide-react';
import RouteBadge from '../common/RouteBadge';
import StatusBadge from '../common/StatusBadge';

export default function AdminRoutesTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [routes, setRoutes] = useState([
    { id: '21G', name: 'Tambaram ↔ Broadway', mode: 'bus', agency: 'Chennai MTC', stopsCount: 38, status: 'Active' },
    { id: '19B', name: 'Kelambakkam ↔ Saidapet', mode: 'bus', agency: 'Chennai MTC', stopsCount: 42, status: 'Active' },
    { id: '500', name: 'Chengalpattu ↔ Broadway', mode: 'bus', agency: 'Chennai MTC', stopsCount: 48, status: 'Active' },
    { id: '515', name: 'Tambaram ↔ Mamallapuram', mode: 'bus', agency: 'Chennai MTC', stopsCount: 35, status: 'Active' },
    { id: 'Blue Line', name: 'Wimco Nagar ↔ Chennai Airport', mode: 'metro', agency: 'CMRL Metro', stopsCount: 26, status: 'Active' },
    { id: 'Green Line', name: 'Chennai Central ↔ St. Thomas Mount', mode: 'metro', agency: 'CMRL Metro', stopsCount: 17, status: 'Active' },
    { id: 'MS-TBM', name: 'Chennai Beach ↔ Tambaram Local', mode: 'suburban', agency: 'Southern Railway', stopsCount: 18, status: 'Active' }
  ]);

  const filteredRoutes = routes.filter((r) => {
    const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) || r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = selectedMode === 'all' || r.mode === selectedMode;
    const matchesAgency = selectedAgency === 'all' || r.agency.toLowerCase().includes(selectedAgency.toLowerCase());
    return matchesSearch && matchesMode && matchesAgency;
  });

  return (
    <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '22px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Table Controls Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Layers size={18} color="#025AED" />
          <span>Transit Routes Management ({filteredRoutes.length})</span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', borderRadius: '12px', background: '#025AED', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Plus size={16} />
          <span>Add Route</span>
        </button>
      </div>

      {/* Filter Controls Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Search size={15} color="#64748B" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search route no or name..."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}
          />
        </div>

        {/* Mode Selector */}
        <select
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', outline: 'none' }}
        >
          <option value="all">All Modes</option>
          <option value="bus">Bus 🚌</option>
          <option value="metro">Metro 🚇</option>
          <option value="suburban">Local Train 🚆</option>
        </select>

        {/* Agency Selector */}
        <select
          value={selectedAgency}
          onChange={(e) => setSelectedAgency(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', outline: 'none' }}
        >
          <option value="all">All Agencies</option>
          <option value="mtc">Chennai MTC</option>
          <option value="cmrl">CMRL Metro</option>
          <option value="southern">Southern Railway</option>
        </select>
      </div>

      {/* Routes Data List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {filteredRoutes.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.8rem 1rem',
              borderRadius: '16px',
              background: '#F8FAFC',
              border: '1px solid #F1F5F9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <RouteBadge routeNo={r.id} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{r.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                  {r.agency} • {r.stopsCount} stops
                </div>
              </div>
            </div>

            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
