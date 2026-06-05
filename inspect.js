const fs = require('fs');
const content = fs.readFileSync('C:/Users/sup.luciana/Desktop/AntiGravity/PAINEL GERAL/data_v2.js', 'utf8');
const match = content.match(/meta2024['"]?\s*:\s*\[([\s\S]*?)\]/);
if (match) console.log(match[0].substring(0, 500));
else console.log('not found');
