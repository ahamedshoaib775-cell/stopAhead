// scripts/generate-logo-assets.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../public/logo Sa.png');
const publicDir = path.join(__dirname, '../public');

async function generateAssets() {
  console.log('Processing source logo image:', srcPath);
  
  if (!fs.existsSync(srcPath)) {
    console.error('Source logo file not found at:', srcPath);
    process.exit(1);
  }

  // 1. Copy standardized full logo file
  const fullLogoPath = path.join(publicDir, 'logo-sa.png');
  fs.copyFileSync(srcPath, fullLogoPath);
  console.log('Saved full logo to:', fullLogoPath);

  // 2. Crop Icon Mark alone (Pin icon: x=419..836, y=102..839)
  // Pin icon box: left 410, top 95, width 435, height 750
  const iconExtract = {
    left: 410,
    top: 95,
    width: 435,
    height: 750
  };

  // Load raw pixels of cropped icon mark to convert background (near white [253,255,254]) to transparent
  const croppedRaw = await sharp(srcPath)
    .extract(iconExtract)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = croppedRaw;
  const { width, height, channels } = info;
  
  // Make near-white background transparent for icon mark
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Background threshold (near white)
    if (r >= 240 && g >= 240 && b >= 240) {
      data[i + 3] = 0; // Alpha = 0 (transparent)
    }
  }

  const iconBuffer = await sharp(data, {
    raw: { width, height, channels }
  }).png().toBuffer();

  const iconPath = path.join(publicDir, 'logo-icon.png');
  fs.writeFileSync(iconPath, iconBuffer);
  console.log('Saved transparent icon mark to:', iconPath);

  // 3. Generate Favicon sizes (16x16, 32x32, favicon.ico)
  const fav16 = await sharp(iconBuffer).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), fav16);

  const fav32 = await sharp(iconBuffer).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), fav32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fav32);

  console.log('Saved favicon 16x16, 32x32, favicon.ico');

  // 4. Generate PWA Icons (192x192, 512x512 with safe padding)
  // For PWA app icon on homescreen, place the pin icon neatly padded inside a square
  const makePWAIcon = async (size) => {
    const iconSize = Math.round(size * 0.75);
    const resizedIcon = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 11, g: 14, b: 20, alpha: 1 } // App theme dark bg #0b0e14
      }
    })
    .composite([{ input: resizedIcon, gravity: 'center' }])
    .png()
    .toBuffer();
  };

  const pwa192 = await makePWAIcon(192);
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

  const pwa512 = await makePWAIcon(512);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

  console.log('Saved PWA icons 192x192 and 512x512');
  console.log('All logo assets successfully generated!');
}

generateAssets().catch(err => {
  console.error('Error generating logo assets:', err);
  process.exit(1);
});
