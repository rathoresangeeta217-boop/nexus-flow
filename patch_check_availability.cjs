const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetDelivery = `                <div className="mb-6">
                  <p className="font-semibold text-slate-900 mb-3">Check Delivery</p>
                  <div className="flex">
                    <input type="text" placeholder="122008" className="border border-slate-300 rounded-l-lg px-4 py-2 w-48 focus:outline-none focus:border-amber-500" />
                    <button className="bg-slate-900 text-white px-4 py-2 rounded-r-lg font-medium">Change</button>
                  </div>
                  
                </div>`;

const newAvailability = `                <div className="mb-6">
                  <button className="w-full sm:w-auto px-8 py-3 rounded-lg border-2 border-slate-200 text-slate-900 font-semibold hover:border-slate-900 hover:bg-slate-50 transition-colors">
                    Check Availability
                  </button>
                </div>`;

content = content.replace(targetDelivery, newAvailability);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched Check Availability");
