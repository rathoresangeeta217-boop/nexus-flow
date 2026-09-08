const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar"`;
const replacement = `className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar"`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched App.tsx padding.");
} else {
  console.log("Could not find App.tsx padding target.");
}
