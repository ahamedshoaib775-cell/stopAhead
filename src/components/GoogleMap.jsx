// GoogleMap.jsx - Forwarding wrapper to MapLibreMap (MapLibre GL JS / OpenFreeMap Engine)
import React from 'react';
import MapLibreMap from './MapLibreMap';

export default function GoogleMap(props) {
  return <MapLibreMap {...props} />;
}
