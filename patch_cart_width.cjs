const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetWidth = `className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"`;
const newWidth = `className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-[70] shadow-2xl flex flex-col"`;

content = content.replace(targetWidth, newWidth);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched cart width");
