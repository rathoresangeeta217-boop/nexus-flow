const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

const newForm = `              <form id="new-purchase-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Name</label>
                    <input 
                      type="text" 
                      name="productName"
                      value={formData.productName}
                      onChange={handleChange}
                      onBlur={handleGenerateDescription}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      placeholder="e.g. Raw Steel Sheets"
                      required
                    />
                  </div>
                  
                  {mode === 'purchase' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Specification</label>
                      <input 
                        type="text" 
                        name="specification"
                        value={formData.specification}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        placeholder="e.g. 5mm thickness, industrial grade"
                      />
                    </div>
                  )}

                  {mode === 'catalog' ? (
                    <>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Main Category</label>
                        <select 
                          value={selectedMainCategory}
                          onChange={(e) => {
                            setSelectedMainCategory(e.target.value);
                            // If no subcategories, set the main category as the final category
                            if (CATALOG_CATEGORIES[e.target.value]?.length === 0) {
                              setFormData(prev => ({ ...prev, category: e.target.value }));
                            } else {
                              setFormData(prev => ({ ...prev, category: '' })); // reset subcategory
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required
                        >
                          <option value="" disabled>Select Menu</option>
                          {Object.keys(CATALOG_CATEGORIES).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sub Category</label>
                        <select 
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required
                          disabled={!selectedMainCategory || CATALOG_CATEGORIES[selectedMainCategory]?.length === 0}
                        >
                          <option value="" disabled>Select Sub Menu</option>
                          {selectedMainCategory && CATALOG_CATEGORIES[selectedMainCategory]?.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                          {selectedMainCategory && CATALOG_CATEGORIES[selectedMainCategory]?.length === 0 && (
                            <option value={selectedMainCategory}>{selectedMainCategory}</option>
                          )}
                        </select>
                      </div>
                      
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Price</label>
                        <input 
                          type="number" 
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. 15000"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</label>
                        <input 
                          type="text" 
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          list="product-categories"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          placeholder="Select or enter category (e.g. Hardware)"
                        />
                        <datalist id="product-categories">
                          {Array.from(new Set(vendors.map((v, i) => v.category).filter(Boolean))).map(cat => (
                            <option key={cat} value={cat as string} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Measuring Metric</label>
                        <select 
                          name="measuringMetric"
                          value={formData.measuringMetric}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required={mode === 'purchase'}
                        >
                          <option value="kg">kg</option>
                          <option value="sqft">sqft</option>
                          <option value="meters">meters</option>
                          <option value="liters">liters</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Unit Price</label>
                        <input 
                          type="text" 
                          name="totalUnitPrice"
                          value={formData.totalUnitPrice}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. ₹1000"
                          required={mode === 'purchase'}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Per Unit Price</label>
                        <input 
                          type="text" 
                          name="perUnitPrice"
                          value={formData.perUnitPrice}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder="e.g. ₹10/kg"
                          required={mode === 'purchase'}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vendor</label>
                        <select 
                          name="vendorId"
                          value={formData.vendorId}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                          required={mode === 'purchase'}
                        >
                          <option value="" disabled>Select a vendor</option>
                          {vendors.map((v, i) => (
                            <option key={\`\${v.docId || v.id || 'k'}-\${i}\`} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      Details 
                      {isGeneratingDesc && <span className="text-indigo-500 lowercase text-[10px] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> auto writing...</span>}
                    </label>
                    <textarea 
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none custom-scrollbar"
                      placeholder="Additional details about the product..."
                    />
                  </div>
                </div>`;

const regex = /<form id="new-purchase-form" onSubmit={handleSubmit} className="space-y-4">[\s\S]*?(?=<!-- Attachments Section -->|<div className="mt-8">)/;
content = content.replace(regex, newForm + "\n\n                {/* Attachments Section */}\n                <div className=\"mt-8\">\n");

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched form");
