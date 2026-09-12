const fs = require('fs');
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

content = content.replace(
  'setIsLoadingFiles(true);',
  'setIsLoadingFiles(true);\n      setPaymentRecord(null);\n      setFiles({});'
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched modal clear state");
