// parse_mtc_csv.js - Converts mtc_bus_routes_stops.csv into a lightweight JS data module
import fs from 'fs';
import path from 'path';

const csvPath = 'C:\\Users\\Acer Nitro Anv 15\\Desktop\\stop-alert-premium\\mtc_bus_routes_stops.csv';

if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found at:', csvPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf8');
const lines = fileContent.split(/\r?\n/);

console.log(`Loaded CSV with ${lines.length} lines.`);

const routesMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Simple CSV parser for "Route Number,Stop Number,Stop Name"
  const match = line.match(/^([^,]+),([^,]+),"(.*)"$/) || line.match(/^([^,]+),([^,]+),(.*)$/);
  if (!match) continue;

  const routeNumber = match[1].trim();
  const stopNumber = parseInt(match[2].trim(), 10);
  const stopName = match[3].trim().replace(/^"/, '').replace(/"$/, '');

  if (!routesMap.has(routeNumber)) {
    routesMap.set(routeNumber, []);
  }

  routesMap.get(routeNumber).push({ stopNumber, stopName });
}

console.log(`Parsed ${routesMap.size} unique MTC bus routes.`);

const formattedRoutes = [];

for (const [routeNumber, stopsObj] of routesMap.entries()) {
  stopsObj.sort((a, b) => a.stopNumber - b.stopNumber);
  const stopNames = stopsObj.map(s => s.stopName);

  formattedRoutes.push({
    id: `mtc-csv-${routeNumber}`,
    routeNumber: routeNumber,
    operator: 'MTC',
    serviceType: 'MTC Service',
    mode: 'bus',
    source: 'MTC Official (mtc_bus_routes_stops.csv)',
    lastVerifiedAt: '2026-08-17',
    stops: stopNames
  });
}

const outputPath = path.resolve('src/data/mtcDataset.js');
const jsCode = `// mtcDataset.js - Generated from official MTC Bus Routes & Stops dataset (${formattedRoutes.length} total routes)
export const MTC_CSV_BUS_ROUTES = ${JSON.stringify(formattedRoutes, null, 2)};
`;

fs.writeFileSync(outputPath, jsCode, 'utf8');
console.log(`Successfully generated ${outputPath} with ${formattedRoutes.length} MTC routes!`);
