const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetBlock = `                if (filters) {
                  return filters.map(filterGroup => (
                    <div key={filterGroup.title} className="mb-8">
                      <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">{filterGroup.title}</h4>
                      <div className="space-y-3">
                        {filterGroup.options.map(option => (
                          <label key={option} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                            <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ));
                }

                // Default filters if no specific category filters exist
                return (
                  <>
                    <div className="mb-8">
                      <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Price</h4>
                      <div className="space-y-3">
                        {['Under ₹10,000', '₹10,000 - ₹20,000', '₹20,000 - ₹50,000', 'Over ₹50,000'].map(price => (
                          <label key={price} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                            <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Size</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Small', 'Medium', 'Large'].map(size => (
                          <button key={size} className="px-4 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );`;


const newBlock = `                return (
                  <>
                    {filters && filters.map(filterGroup => (
                      <div key={filterGroup.title} className="mb-8">
                        <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">{filterGroup.title}</h4>
                        <div className="space-y-3">
                          {filterGroup.options.map(option => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                              <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="mb-8">
                      <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Price</h4>
                      <div className="space-y-3">
                        {['Under ₹10,000', '₹10,000 - ₹20,000', '₹20,000 - ₹50,000', 'Over ₹50,000'].map(price => (
                          <label key={price} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300" />
                            <span className="text-sm text-slate-600 group-hover:text-amber-600 transition-colors">{price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-4 text-sm uppercase tracking-wide">Size</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Small', 'Medium', 'Large'].map(size => (
                          <button key={size} className="px-4 py-1.5 text-sm font-medium border border-slate-200 rounded-md hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );`;


content = content.replace(targetBlock, newBlock);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched filters to always show price and size");
