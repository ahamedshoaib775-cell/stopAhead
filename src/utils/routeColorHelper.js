// routeColorHelper.js - Deterministic Route Color Hashing System
const ROUTE_COLOR_PALETTE = [
  { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', name: 'red' },      // 0: Red
  { id: 'blue', bg: '#DBEAFE', text: '#025AED', border: '#93C5FD', name: 'blue' },     // 1: Blue
  { bg: '#CCFBF1', text: '#0D9488', border: '#5EEAD4', name: 'teal' },    // 2: Teal
  { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC', name: 'green' },   // 3: Green
  { bg: '#F3E8FF', text: '#7C3AED', border: '#C084FC', name: 'purple' },  // 4: Purple
  { bg: '#FEF3C7', text: '#D97706', border: '#FDE047', name: 'amber' }    // 5: Amber
];

const OFFICIAL_LINE_COLORS = {
  'blue line': { bg: '#DBEAFE', text: '#025AED', border: '#93C5FD', label: 'Blue Line' },
  'green line': { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC', label: 'Green Line' },
  'red line': { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', label: 'Red Line' },
  'yellow line': { bg: '#FEF3C7', text: '#D97706', border: '#FDE047', label: 'Yellow Line' },
  'purple line': { bg: '#F3E8FF', text: '#7C3AED', border: '#C084FC', label: 'Purple Line' }
};

/**
 * Returns a consistent badge color object for any route number or line name.
 */
export function getRouteBadgeColor(routeNo = '') {
  const str = String(routeNo || '').trim();
  const lower = str.toLowerCase();

  // 1. Check Official Line Colors first
  if (OFFICIAL_LINE_COLORS[lower]) {
    return OFFICIAL_LINE_COLORS[lower];
  }

  // 2. Deterministic Hash for numeric/alphanumeric routes (e.g. "21G", "500", "19B")
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ROUTE_COLOR_PALETTE.length;
  return ROUTE_COLOR_PALETTE[index];
}
