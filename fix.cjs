const fs = require('fs');
const file = 'src/components/VendorPaymentModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('Payment Phases'));
console.log("Found Payment Phases at line", startIndex);

