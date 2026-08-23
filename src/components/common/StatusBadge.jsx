// StatusBadge.jsx - Consistent Active/Success (Green) vs Inactive (Gray) Pill
import React from 'react';

export default function StatusBadge({ status = 'Active', label = null }) {
  const isSuccess = (status || '').toLowerCase() === 'active' || (status || '').toLowerCase() === 'success';
  const text = label || status;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: 800,
        background: isSuccess ? '#DCFCE7' : '#F1F5F9',
        color: isSuccess ? '#16A34A' : '#64748B',
        border: `1px solid ${isSuccess ? '#86EFAC' : '#E2E8F0'}`,
        lineHeight: 1.2
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: isSuccess ? '#16A34A' : '#94A3B8'
        }}
      />
      <span>{text}</span>
    </span>
  );
}
