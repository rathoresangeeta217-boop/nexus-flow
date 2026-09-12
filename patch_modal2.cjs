const fs = require('fs');
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf8');

content = content.replace(
  'if (isOpen && order) {',
  `if (!isOpen) {
      setPaymentRecord(null);
      setFiles({});
      return;
    }
    if (isOpen && order) {`
);

fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched modal to clear on close");
