const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../../frontend/src/assets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

files.forEach(f => {
  const p = path.join(dir, f);
  const data = fs.readFileSync(p, 'utf8');
  const svgTag = data.match(/<svg[^>]+>/)?.[0] || 'no svg tag';
  const imgTag = data.match(/<image[^>]+>/)?.[0] || 'no image tag';
  const base64Match = data.match(/data:image\/([a-zA-Z]+);base64,([A-Za-z0-9+/=]+)/);
  
  console.log('FILE:', f);
  console.log('  svg:', svgTag.slice(0, 150));
  console.log('  img:', imgTag.slice(0, 150));
  if (base64Match) {
    console.log('  embedded image format:', base64Match[1], 'sample len:', base64Match[2].length);
    // Write out the raw image to scratch to see what each is
    const imgBuf = Buffer.from(base64Match[2], 'base64');
    const outPath = path.resolve(__dirname, `asset_${f.replace('.svg', '')}.${base64Match[1]}`);
    fs.writeFileSync(outPath, imgBuf);
    console.log('  saved to:', outPath);
  }
});
