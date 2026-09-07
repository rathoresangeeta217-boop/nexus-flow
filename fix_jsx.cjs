const fs = require('fs');
const file = 'src/components/VendorPaymentModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

const badStr = "                      </select>\n                    </div>\n                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">";
const goodStr = "                      </select>\n                      </div>\n                    </div>\n                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">";

if (content.includes(badStr)) {
  content = content.replace(badStr, goodStr);
  fs.writeFileSync(file, content);
  console.log("Fixed!");
} else {
  console.log("Pattern not found!");
}
