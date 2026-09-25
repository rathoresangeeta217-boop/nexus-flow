const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

// Update Title
content = content.replace(
  '<h3 className="font-bold text-slate-800 text-lg">Add Product</h3>',
  '<h3 className="font-bold text-slate-800 text-lg">{mode === \'catalog\' ? \'Add Catalog Product\' : \'Add Product\'}</h3>'
);

// Update Subtitle
content = content.replace(
  '<p className="text-xs font-medium text-slate-500">Add a new product to purchase</p>',
  '<p className="text-xs font-medium text-slate-500">{mode === \'catalog\' ? \'Add a new product to your directory\' : \'Add a new product to purchase\'}</p>'
);

// Update Placeholder
content = content.replace(
  'placeholder="e.g. Raw Steel Sheets"',
  'placeholder={mode === \'catalog\' ? \'e.g. Executive Office Chair\' : \'e.g. Raw Steel Sheets\'}'
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched NewProductModal");
