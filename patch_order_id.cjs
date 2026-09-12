const fs = require('fs');
let content = fs.readFileSync('src/tabs/OrdersTab.tsx', 'utf8');

// replace id: \`ORD-2026-\${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}\`,
// with a more unique one
content = content.replace(
  /id: `ORD-2026-\$\{String\(Math\.floor\(Math\.random\(\) \* 1000\)\)\.padStart\(3, '0'\)\}`,/,
  'id: `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${String(Math.floor(Math.random() * 1000)).padStart(3, \'0\')}`,'
);

fs.writeFileSync('src/tabs/OrdersTab.tsx', content);
console.log("Patched Order ID generation");
