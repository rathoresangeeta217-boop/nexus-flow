const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// Replace in the Main Image block
content = content.replace(
  'className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 mix-blend-multiply aspect-square relative"',
  'className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative"'
);

// Replace in the product cards
content = content.replace(
  'className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-6 mix-blend-multiply"',
  'className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-6"'
);

// Replace in the color thumbnails
content = content.replace(
  'className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer hover:border-amber-300 overflow-hidden p-1 bg-slate-50 mix-blend-multiply opacity-50"',
  'className="w-12 h-12 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer hover:border-amber-300 overflow-hidden p-1 bg-slate-50 opacity-50"'
);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched mix-blend-multiply");
