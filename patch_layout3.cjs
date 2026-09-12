const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

content = content.replace(
  '<div className="w-full lg:w-1/2 flex gap-4">\\n                {/* Thumbnails */}',
  '<div className="w-full lg:w-3/5 flex gap-6 shrink-0">\\n                {/* Thumbnails */}'
);

content = content.replace(
  '<div className="w-full lg:w-1/2 flex flex-col">\\n                <div className="flex items-center gap-2 mb-3">',
  '<div className="w-full lg:w-2/5 flex flex-col min-w-0">\\n                <div className="flex items-center gap-2 mb-3">'
);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched layout properly");
