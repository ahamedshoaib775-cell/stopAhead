// RouteBadge.jsx - Standardized Color-Coded Route Badge Pill
import React from 'react';
import { getRouteBadgeColor } from '../../utils/routeColorHelper';

export default function RouteBadge({ routeNo, style = {} }) {
  if (!routeNo) return null;
  const colors = getRouteBadgeColor(routeNo);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        fontSize: '0.76rem',
        fontWeight: 800,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        ...style
      }}
    >
      {routeNo}
    </span>
  );
}
