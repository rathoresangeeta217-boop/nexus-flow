const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetLogo = `<img src="/logo.png" alt="SRK Modular Furniture co" className="h-10 w-auto" />`;
const newLogo = `<img src="/logo.png" alt="SRK Modular Furniture co" className="h-16 md:h-20 w-auto object-contain" />`;

// Let's also adjust the header height slightly so the larger logo fits well
const targetHeaderDiv = `<div className="flex items-center justify-between h-16">`;
const newHeaderDiv = `<div className="flex items-center justify-between h-20 md:h-24">`;

content = content.replace(targetLogo, newLogo);
content = content.replace(targetHeaderDiv, newHeaderDiv);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched logo size and header height");
