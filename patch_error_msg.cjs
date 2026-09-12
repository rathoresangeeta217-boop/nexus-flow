const fs = require('fs');
let content = fs.readFileSync('src/components/NewOrderModal.tsx', 'utf8');

content = content.replace(
  "{extractError.includes('limit') && (",
  "{ (extractError.includes('limit') || extractError.includes('Quota')) && ("
);

fs.writeFileSync('src/components/NewOrderModal.tsx', content);
console.log("Patched error message check");
