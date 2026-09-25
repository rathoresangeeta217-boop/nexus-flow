const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

const detailsLabelRegex = /<label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">\s*Details\s*\{isGeneratingDesc && <span className="text-indigo-500 lowercase text-\[10px\] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" \/> auto writing...<\/span>\}\s*<\/label>/;

const newDetailsLabel = `<label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between w-full">
                      <span>Details</span>
                      <button 
                        type="button" 
                        onClick={handleGenerateDescription}
                        disabled={isGeneratingDesc || !formData.productName}
                        className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center gap-1 text-[10px] lowercase px-2 py-1 bg-indigo-50 rounded"
                      >
                        {isGeneratingDesc ? <><Loader2 className="w-3 h-3 animate-spin" /> auto writing...</> : "✨ auto-write"}
                      </button>
                    </label>`;

content = content.replace(detailsLabelRegex, newDetailsLabel);
fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal details label");
