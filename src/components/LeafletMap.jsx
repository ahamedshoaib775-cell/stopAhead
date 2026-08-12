// LeafletMap.jsx - Standardized forwarding wrapper to MapLibreMap (MapLibre GL JS / OpenFreeMap Engine)
import React from 'react';
import MapLibreMap from './MapLibreMap';

export default function LeafletMap(props) {
  return <MapLibreMap {...props} />;
}
