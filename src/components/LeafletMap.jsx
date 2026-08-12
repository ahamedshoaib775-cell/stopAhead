// LeafletMap.jsx - Wrapper for GoogleMap engine (Google Maps Platform Migration)
import React from 'react';
import GoogleMap from './GoogleMap';

export default function LeafletMap(props) {
  return <GoogleMap {...props} />;
}
