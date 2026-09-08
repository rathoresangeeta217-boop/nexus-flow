const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("paymentRecord?.phases.filter", "paymentRecord?.phases?.filter");

fs.writeFileSync(path, content);
console.log("Fixed optional chaining.");
