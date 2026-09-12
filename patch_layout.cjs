const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

content = content.replace(
  '<div className="flex flex-col lg:flex-row gap-12">',
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">'
);

content = content.replace(
  '{/* Left: Images */}\\n              <div className="w-full lg:w-1/2 flex gap-4">',
  '{/* Left: Images */}\\n              <div className="flex gap-4 min-w-0">'
);

content = content.replace(
  '{/* Right: Info */}\\n              <div className="w-full lg:w-1/2 flex flex-col">',
  '{/* Right: Info */}\\n              <div className="flex flex-col min-w-0">'
);

// Also add overflow-hidden to the main image box just in case
content = content.replace(
  '<div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative">',
  '<div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative overflow-hidden">'
);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched layout");
