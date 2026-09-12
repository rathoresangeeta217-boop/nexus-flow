const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

// I will just use regex to replace it
content = content.replace(/\{(\/\* Left: Images \*\/)\}\s*<div className="w-full lg:w-1\/2 flex gap-4">/g, '{$1}\n              <div className="w-full lg:w-3/5 flex gap-6 shrink-0">');
content = content.replace(/\{(\/\* Right: Info \*\/)\}\s*<div className="w-full lg:w-1\/2 flex flex-col">/g, '{$1}\n              <div className="w-full lg:w-2/5 flex flex-col min-w-0">');

// There was also a place where I accidentally made it <div className="flex gap-4 min-w-0"> in the first patch
content = content.replace(/\{(\/\* Left: Images \*\/)\}\s*<div className="flex gap-4 min-w-0">/g, '{$1}\n              <div className="w-full lg:w-3/5 flex gap-6 shrink-0">');
content = content.replace(/\{(\/\* Right: Info \*\/)\}\s*<div className="flex flex-col min-w-0">/g, '{$1}\n              <div className="w-full lg:w-2/5 flex flex-col min-w-0">');

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched via regex");
