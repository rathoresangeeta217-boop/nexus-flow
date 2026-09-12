const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// 1. Remove "Earn up to 59 reward points"
content = content.replace(
  '<span className="ml-2 text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-0.5 rounded-full font-medium">Earn up to 59 reward points</span>',
  ''
);

// 2. Remove the EMI/Pay Later block
const emiBlock = `                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    <span className="text-green-600">₹1 now + ₹599/month (2 months)</span> via Pay Later
                  </p>
                  <p className="text-xs text-slate-500">UPI & Cards Accepted | Buy on EMI</p>
                </div>`;
content = content.replace(emiBlock, '');

// 3. Remove "Free delivery | By Monday, 14 Sept"
const deliveryText = `<p className="text-sm mt-2">
                    <span className="text-green-600 font-medium">Free delivery</span> | By Monday, 14 Sept
                  </p>`;
content = content.replace(deliveryText, '');

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Removed selected UI elements");
