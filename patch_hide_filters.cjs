const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');

const targetStr = `{/* Left Sidebar: Filters */}
          {!searchQuery && (`;
const newStr = `{/* Left Sidebar: Filters */}
          {!searchQuery && selectedCategory !== 'All' && (`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
console.log("Patched filter visibility");
