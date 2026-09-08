const fs = require('fs');
const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is that the amount string can have "Rs." which contains a period.
// "Rs. 4,47,987" -> replace(/[^0-9.]/g, '') -> ".447987"
// parseFloat(".447987") -> 0.447987

const parseTarget = `      // Parse amount properly - take the total amount directly
      const amountStr = String(order.amount || order.details?.totalAmount || '0').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;`;

const parseReplacement = `      // Parse amount properly - take the total amount directly
      const amountStr = String(order.amount || order.details?.totalAmount || '0')
        .replace(/Rs\\.?\\s*/g, '')
        .replace(/₹\\s*/g, '')
        .replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;`;

if (content.includes(parseTarget)) {
  content = content.replace(parseTarget, parseReplacement);
  fs.writeFileSync(path, content);
  console.log("Successfully fixed amount parsing.");
} else {
  console.log("Could not find parseTarget.");
}

