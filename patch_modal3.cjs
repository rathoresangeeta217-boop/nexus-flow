const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\{paymentRecord && \(\s*(<div className="bg-slate-50 rounded-xl p-5 border border-slate-100">[\s\S]*?Financial Overview & Payment Details[\s\S]*?)\n\s*\}\)/;
const match = content.match(regex);
if (match) {
  content = content.replace(regex, match[1]);
  fs.writeFileSync(path, content);
  console.log("Successfully removed paymentRecord wrapper");
} else {
  console.log("Could not find paymentRecord wrapper");
}
