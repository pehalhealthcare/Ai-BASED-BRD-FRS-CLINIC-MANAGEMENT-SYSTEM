const fs = require('fs');
const path = require('path');

const imgPath = 'C:/Users/Lenovo/.gemini/antigravity-ide/brain/9f76f369-c475-423f-93e0-29f385603ded/dental_specialty_clinic_1789481663204.jpg';
const outPath = path.resolve(__dirname, '../../frontend/src/assets/aicms_image_dental.svg');

const data = fs.readFileSync(imgPath);
const base64 = data.toString('base64');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1536" height="1024" viewBox="0 0 1536 1024">
  <image width="1536" height="1024"
         preserveAspectRatio="none"
         href="data:image/jpeg;base64,${base64}"/>
</svg>`;

fs.writeFileSync(outPath, svg);
console.log('Successfully written dental SVG to:', outPath);
