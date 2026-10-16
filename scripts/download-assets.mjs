import fs from 'node:fs';
import path from 'node:path';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
if (!FIGMA_TOKEN) throw new Error('Defina FIGMA_TOKEN para baixar as referências. A aplicação usa os arquivos locais e não precisa desse token.');
const FILE_KEY = 'Ff0SksUi7UFtPWUO8kyNtw';

const assetsToDownload = [
  // NFTs from Catalog
  { id: '4:137', name: 'emerald-ape.png', format: 'png', scale: 2 },
  { id: '4:162', name: 'sage-nomad.png', format: 'png', scale: 2 },
  { id: '4:164', name: 'neon-vessel.png', format: 'png', scale: 2 },
  { id: '4:280', name: 'cosmic-bloom.png', format: 'png', scale: 2 },
  { id: '4:282', name: 'violet-nomad.png', format: 'png', scale: 2 },
  { id: '4:284', name: 'ivory-baron.png', format: 'png', scale: 2 },
  { id: '4:286', name: 'golden-beat.png', format: 'png', scale: 2 },
  { id: '4:289', name: 'golden-signal.png', format: 'png', scale: 2 },
  { id: '4:291', name: 'cyber-relic.png', format: 'png', scale: 2 },
  
  // Hero & Banners
  { id: '70342:2673', name: 'hero-nft.png', format: 'png', scale: 2 },
  { id: '70410:3798', name: 'featured-banner.png', format: 'png', scale: 2 },
  { id: '4:428', name: 'promo-genesis.png', format: 'png', scale: 2 },
  { id: '4:423', name: 'promo-curated.png', format: 'png', scale: 2 },
  
  // Detail Gallery
  { id: '11:1161', name: 'detail-main.png', format: 'png', scale: 2 },
  { id: '11:1181', name: 'detail-thumb-1.png', format: 'png', scale: 2 },
  { id: '11:1188', name: 'detail-thumb-2.png', format: 'png', scale: 2 },
  { id: '11:1189', name: 'detail-thumb-3.png', format: 'png', scale: 2 },
  { id: '11:1190', name: 'detail-thumb-4.png', format: 'png', scale: 2 },

  // Blog Articles
  { id: '70343:259', name: 'blog-1.png', format: 'png', scale: 2 },
  { id: '70343:268', name: 'blog-2.png', format: 'png', scale: 2 },
  { id: '70343:277', name: 'blog-3.png', format: 'png', scale: 2 },
  { id: '70343:286', name: 'blog-4.png', format: 'png', scale: 2 },
];

async function download() {
  const ids = assetsToDownload.map(a => a.id).join(',');
  const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${ids}&format=png&scale=2`;
  
  console.log('Fetching asset image URLs from Figma API...');
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN }
  });
  
  if (!res.ok) {
    throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  const images = data.images || {};
  
  const outputDir = path.resolve('public/assets/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Downloading ${assetsToDownload.length} assets to public/assets/images/...`);
  
  for (const asset of assetsToDownload) {
    const imageUrl = images[asset.id];
    if (!imageUrl) {
      console.warn(`No image URL found for ${asset.id} (${asset.name})`);
      continue;
    }
    
    const filePath = path.join(outputDir, asset.name);
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`Failed to download ${asset.name}: ${imgRes.status}`);
      continue;
    }
    
    const arrayBuffer = await imgRes.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    console.log(`✓ Saved ${asset.name} (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`);
  }
  
  console.log('All Figma image assets downloaded successfully!');
}

download().catch(err => {
  console.error('Error downloading assets:', err);
  process.exit(1);
});
