const fs = require('fs');
let content = fs.readFileSync('src/tabs/DispatchedTab.tsx', 'utf8');
content = content.replace(
  `const pendingStatuses = ['New', 'Processing', 'Pending'];`,
  `const pendingStatuses = ['New Order', 'New', 'Processing', 'Pending'];`
);
fs.writeFileSync('src/tabs/DispatchedTab.tsx', content);
console.log("Patched DispatchedTab.tsx");
