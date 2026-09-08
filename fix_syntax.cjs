const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\`₹\\\$\{/g, "`₹${");
content = content.replace(/\}\\\`/g, "}`");

fs.writeFileSync(path, content);
console.log("Fixed syntax error.");
