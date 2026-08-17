// scripts/parse_transitland_csv.js - Parses transitland_feeds_free.csv into structured transitlandDataset.js
import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('src/data/transitland_feeds_free.csv');

if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found at:', csvPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, 'utf8');
const lines = fileContent.split(/\r?\n/);

console.log(`Loaded transitland_feeds_free.csv with ${lines.length} lines.`);

const feeds = [];

function cleanFeedName(onestopId) {
  if (!onestopId) return 'GTFS Feed';
  let clean = onestopId.replace(/^f-/, '');
  clean = clean.replace(/~[a-z]{2}~[a-z]{2}$/, '');
  clean = clean.replace(/~/, ' - ');
  return clean.toUpperCase();
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const parts = line.split(',');
  if (parts.length < 2) continue;

  const onestopId = parts[0].trim();
  const feedUrl = parts[1].trim();
  const format = parts[2] ? parts[2].trim() : 'GTFS';
  const lastFetched = parts[3] ? parts.slice(3).join(',').trim() : '';

  feeds.push({
    id: onestopId,
    name: cleanFeedName(onestopId),
    onestopId,
    feedUrl,
    format,
    lastFetched
  });
}

const outputPath = path.resolve('src/data/transitlandDataset.js');
const jsCode = `// transitlandDataset.js - Sourced from transitland_feeds_free.csv (${feeds.length} GTFS Feeds)
export const TRANSITLAND_FEEDS = ${JSON.stringify(feeds, null, 2)};
`;

fs.writeFileSync(outputPath, jsCode, 'utf8');
console.log(`Successfully generated ${outputPath} with ${feeds.length} GTFS feeds!`);
