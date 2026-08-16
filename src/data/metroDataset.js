// metroDataset.js - Sourced from official CMRL Metro dataset with station coordinates
export const METRO_STATIONS_COORDS = [
  { name: "Wimco Nagar Depot Metro", line: "Blue Line (Line 1)", lat: 13.1764, lng: 80.3015 },
  { name: "Wimco Nagar Metro", line: "Blue Line (Line 1)", lat: 13.1678, lng: 80.3012 },
  { name: "Thiruvotriyur Metro", line: "Blue Line (Line 1)", lat: 13.1592, lng: 80.3006 },
  { name: "Thiruvottriyur Theradi Metro", line: "Blue Line (Line 1)", lat: 13.1518, lng: 80.3001 },
  { name: "Kaladipet Metro", line: "Blue Line (Line 1)", lat: 13.1420, lng: 80.2995 },
  { name: "Tollgate Metro", line: "Blue Line (Line 1)", lat: 13.1310, lng: 80.2980 },
  { name: "New Washermenpet Metro", line: "Blue Line (Line 1)", lat: 13.1180, lng: 80.2950 },
  { name: "Tondiarpet Metro", line: "Blue Line (Line 1)", lat: 13.1100, lng: 80.2910 },
  { name: "Sir Thiyagaraya College Metro", line: "Blue Line (Line 1)", lat: 13.1020, lng: 80.2870 },
  { name: "Washermenpet Metro", line: "Blue Line (Line 1)", lat: 13.0975, lng: 80.2825 },
  { name: "Mannadi Metro", line: "Blue Line (Line 1)", lat: 13.0910, lng: 80.2860 },
  { name: "Highcourt Metro", line: "Blue Line (Line 1)", lat: 13.0870, lng: 80.2875 },
  { name: "Chennai Central Metro", line: "Blue Line & Green Line Interchange", lat: 13.0818, lng: 80.2762 },
  { name: "Government Estate Metro", line: "Blue Line (Line 1)", lat: 13.0675, lng: 80.2725 },
  { name: "LIC Metro", line: "Blue Line (Line 1)", lat: 13.0625, lng: 80.2660 },
  { name: "Thousand Lights Metro", line: "Blue Line (Line 1)", lat: 13.0560, lng: 80.2560 },
  { name: "AG - DMS Metro", line: "Blue Line (Line 1)", lat: 13.0485, lng: 80.2490 },
  { name: "Teynampet Metro", line: "Blue Line (Line 1)", lat: 13.0435, lng: 80.2440 },
  { name: "Nandanam Metro", line: "Blue Line (Line 1)", lat: 13.0335, lng: 80.2390 },
  { name: "Saidapet Metro", line: "Blue Line (Line 1)", lat: 13.0238, lng: 80.2245 },
  { name: "Little Mount Metro", line: "Blue Line (Line 1)", lat: 13.0175, lng: 80.2200 },
  { name: "Guindy Metro", line: "Blue Line (Line 1)", lat: 13.0080, lng: 80.2130 },
  { name: "Alandur Metro", line: "Blue Line & Green Line Interchange", lat: 12.9978, lng: 80.2010 },
  { name: "OTA - Nanganallur Road Metro", line: "Blue Line (Line 1)", lat: 12.9890, lng: 80.1970 },
  { name: "Meenambakkam Metro", line: "Blue Line (Line 1)", lat: 12.9830, lng: 80.1800 },
  { name: "Chennai International Airport Metro", line: "Blue Line (Line 1)", lat: 12.9804, lng: 80.1639 },
  { name: "Egmore Metro", line: "Green Line (Line 2)", lat: 13.0780, lng: 80.2610 },
  { name: "Nehru Park Metro", line: "Green Line (Line 2)", lat: 13.0770, lng: 80.2500 },
  { name: "Kilpauk Metro", line: "Green Line (Line 2)", lat: 13.0785, lng: 80.2420 },
  { name: "Pachaiyappa's College Metro", line: "Green Line (Line 2)", lat: 13.0785, lng: 80.2330 },
  { name: "Shenoy Nagar Metro", line: "Green Line (Line 2)", lat: 13.0785, lng: 80.2250 },
  { name: "Anna Nagar East Metro", line: "Green Line (Line 2)", lat: 13.0860, lng: 80.2180 },
  { name: "Anna Nagar Tower Metro", line: "Green Line (Line 2)", lat: 13.0850, lng: 80.2100 },
  { name: "Thirumangalam Metro", line: "Green Line (Line 2)", lat: 13.0845, lng: 80.1980 },
  { name: "Koyambedu Metro", line: "Green Line (Line 2)", lat: 13.0745, lng: 80.1950 },
  { name: "CMBT Metro", line: "Green Line (Line 2)", lat: 13.0670, lng: 80.1950 },
  { name: "Arumbakkam Metro", line: "Green Line (Line 2)", lat: 13.0610, lng: 80.2050 },
  { name: "Vadapalani Metro", line: "Green Line (Line 2)", lat: 13.0515, lng: 80.2120 },
  { name: "Ashok Nagar Metro", line: "Green Line (Line 2)", lat: 13.0360, lng: 80.2110 },
  { name: "Ekkattuthangal Metro", line: "Green Line (Line 2)", lat: 13.0230, lng: 80.2060 },
  { name: "St. Thomas Mount Metro", line: "Green Line (Line 2)", lat: 12.9900, lng: 80.1980 }
];

export const METRO_CSV_ROUTES = [
  {
    id: "cmrl-blue-line",
    routeNumber: "Blue Line (Line 1)",
    operator: "CMRL",
    serviceType: "Metro Subway",
    mode: "metro",
    source: "CMRL Official (chennai_metro_stations.csv)",
    lastVerifiedAt: "2026-08-17",
    stops: METRO_STATIONS_COORDS.filter(s => s.line.includes('Blue')).map(s => s.name)
  },
  {
    id: "cmrl-green-line",
    routeNumber: "Green Line (Line 2)",
    operator: "CMRL",
    serviceType: "Metro Subway",
    mode: "metro",
    source: "CMRL Official (chennai_metro_stations.csv)",
    lastVerifiedAt: "2026-08-17",
    stops: METRO_STATIONS_COORDS.filter(s => s.line.includes('Green')).map(s => s.name)
  }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestMetroStation(userLat, userLng) {
  if (!userLat || !userLng) return METRO_STATIONS_COORDS[19]; // Default to Saidapet Metro

  let minDistance = Infinity;
  let nearest = METRO_STATIONS_COORDS[0];

  for (const station of METRO_STATIONS_COORDS) {
    const dist = calculateDistance(userLat, userLng, station.lat, station.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = station;
    }
  }

  return {
    ...nearest,
    distKm: parseFloat(minDistance.toFixed(1))
  };
}
