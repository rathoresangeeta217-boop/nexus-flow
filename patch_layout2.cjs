const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// The Left part is currently <div className="w-full lg:w-1/2 flex gap-4">
// We need to change it to <div className="w-full flex gap-4"> or <div className="flex gap-4">
// Also the parent grid could be adjusted to give 60/40 ratio for a better look.

content = content.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">',
  '<div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">'
);

content = content.replace(
  '{/* Left: Images */}\\n              <div className="w-full lg:w-1/2 flex gap-4">',
  '{/* Left: Images */}\\n              <div className="w-full lg:w-3/5 flex gap-6 shrink-0">'
);

content = content.replace(
  '{/* Right: Info */}\\n              <div className="w-full lg:w-1/2 flex flex-col">',
  '{/* Right: Info */}\\n              <div className="w-full lg:w-2/5 flex flex-col min-w-0">'
);

content = content.replace(
  '{/* Right: Info */}\\n              <div className="flex flex-col min-w-0">',
  '{/* Right: Info */}\\n              <div className="w-full lg:w-2/5 flex flex-col min-w-0">'
);

// We should also make the main image w-full to be explicit
content = content.replace(
  '<div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative overflow-hidden">',
  '<div className="flex-1 w-full bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-12 aspect-square relative overflow-hidden">'
);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched layout");
