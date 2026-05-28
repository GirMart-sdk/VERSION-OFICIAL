/**
 * fix_encoding.js
 * Corrige strings garbled y caracteres mal encodificados
 */

const fs = require('fs');
const filePath = process.argv[2] || 'app.js';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let changedCount = 0;

  // Reemplazos basicos y seguros
  const fixes = [
    ['Ã©', 'é'], 
    ['Ã¡', 'á'], 
    ['Ã­', 'í'], 
    ['Ã³', 'ó'], 
    ['Ã±', 'ñ'],
    ['Ã', 'Á'], 
    ['Ã‰', 'É'], 
    ['Ã"', 'Ó'], 
    ['Ãš', 'Ú'], 
    ['Â¡', 'exclamacion'], 
    ['Â¿', 'interrogacion'],
  ];

  for (const [bad, good] of fixes) {
    while (content.includes(bad)) {
      content = content.split(bad).join(good);
      changedCount++;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OK: ' + changedCount + ' cambios en ' + filePath);
  
} catch (err) {
  console.error('Error: ' + err.message);
}
