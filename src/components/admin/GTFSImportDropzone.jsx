// GTFSImportDropzone.jsx - Drag and drop GTFS .zip feed uploader & Recent Imports Table
import React, { useState } from 'react';
import { UploadCloud, FileArchive, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function GTFSImportDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importHistory, setImportHistory] = useState([
    { id: 1, source: 'Chennai_MTC_GTFS_2026.zip', timeAgo: '2 hours ago', routesCount: 154, stopsCount: 1240, status: 'Active' },
    { id: 2, source: 'CMRL_Metro_Feeds_v2.zip', timeAgo: '3 days ago', routesCount: 2, stopsCount: 42, status: 'Active' },
    { id: 3, source: 'SR_Suburban_Trains_2026.zip', timeAgo: '1 week ago', routesCount: 12, stopsCount: 88, status: 'Active' }
  ]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    setImporting(true);
    setTimeout(() => {
      const newImport = {
        id: Date.now(),
        source: file.name,
        timeAgo: 'Just now',
        routesCount: Math.floor(Math.random() * 20) + 5,
        stopsCount: Math.floor(Math.random() * 200) + 50,
        status: 'Active'
      };
      setImportHistory((prev) => [newImport, ...prev]);
      setImporting(false);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        style={{
          border: isDragging ? '2px dashed #025AED' : '2px dashed #CBD5E1',
          borderRadius: '20px',
          padding: '2rem 1.5rem',
          background: isDragging ? 'rgba(2, 90, 237, 0.04)' : '#FFFFFF',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          type="file"
          accept=".zip,.txt,.csv"
          onChange={handleFileDrop}
          style={{ display: 'none' }}
          id="gtfs-file-input"
        />
        <label htmlFor="gtfs-file-input" style={{ cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(2, 90, 237, 0.08)', color: '#025AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {importing ? <RefreshCw size={24} className="spin-animation" /> : <UploadCloud size={26} />}
          </div>

          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
              {importing ? 'Processing GTFS Feed...' : 'Drag and drop GTFS feed here or Choose File'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
              Supports official transit agency GTFS feed .zip files (agency.txt, routes.txt, stops.txt, stop_times.txt up to 500MB)
            </div>
          </div>
        </label>
      </div>

      {/* Recent GTFS Imports Table */}
      <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileArchive size={18} color="#025AED" />
          <span>Recent GTFS Feed Imports</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {importHistory.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.95rem',
                borderRadius: '14px',
                background: '#F8FAFC',
                border: '1px solid #F1F5F9',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={16} color="#16A34A" />
                <div>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>{item.source}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    {item.routesCount} routes • {item.stopsCount} stops • {item.timeAgo}
                  </div>
                </div>
              </div>

              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
