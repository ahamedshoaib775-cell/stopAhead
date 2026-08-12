// GoogleMap.jsx - Forwarding wrapper to LeafletMap (OpenStreetMap / Leaflet Engine)
import React from 'react';
import LeafletMap from './LeafletMap';

export default function GoogleMap(props) {
  return <LeafletMap {...props} />;
}
