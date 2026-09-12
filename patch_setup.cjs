const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetStr = `                <div className="mb-6">
                  <button className="w-full sm:w-auto px-8 py-3 rounded-lg border-2 border-slate-200 text-slate-900 font-semibold hover:border-slate-900 hover:bg-slate-50 transition-colors">
                    Check Availability
                  </button>
                </div>`;

const newStr = `                <div className="mb-6">
                  <button className="w-full sm:w-auto px-8 py-3 rounded-lg border-2 border-slate-200 text-slate-900 font-semibold hover:border-slate-900 hover:bg-slate-50 transition-colors">
                    Check Availability
                  </button>
                </div>

                {selectedProduct.category === "Workstation's" && (
                  <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Let's make your Setup</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Desk Size</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>1200L x 600W mm</option>
                          <option>1500L x 600W mm</option>
                          <option>1800L x 750W mm</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Partition Height</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>1200mm Height</option>
                          <option>1500mm Height</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Add-ons</label>
                        <select className="w-full bg-white border-slate-300 rounded-lg shadow-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                          <option>No Add-ons</option>
                          <option>3-Drawer Mobile Pedestal</option>
                          <option>Keyboard Tray & CPU Trolley</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched setup section");
