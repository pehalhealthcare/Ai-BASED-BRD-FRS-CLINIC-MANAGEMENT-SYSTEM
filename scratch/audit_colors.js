const fs = require('fs');
const content = fs.readFileSync('frontend/src/features/clinics/ClinicRegister.jsx', 'utf8');

const hexes = content.match(/#[0-9A-Fa-f]{3,8}/g) || [];
const uniqueHexes = [...new Set(hexes)];
console.log('Unique Hexes in ClinicRegister.jsx:');
console.log(uniqueHexes);

const lines = content.split('\n');
lines.forEach((line, i) => {
  if (/blue|emerald|green|teal|indigo|purple|amber|slate-900.*text-white|#/.test(line)) {
    if (/blue|purple|amber|teal|emerald|#16A34A|#22c55e/.test(line)) {
      console.log(`Line ${i + 1}: ${line.trim().slice(0, 140)}`);
    }
  }
});
