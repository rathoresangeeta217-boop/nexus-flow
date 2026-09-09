const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!content.includes("{ name: 'Quotations', icon: FileText, section: 'Operations' }")) {
  content = content.replace(
    `  { name: 'Purchase', icon: ShoppingBag, section: 'Operations' },`,
    `  { name: 'Purchase', icon: ShoppingBag, section: 'Operations' },\n  { name: 'Quotations', icon: FileText, section: 'Operations' },`
  );
  
  if (!content.includes('FileText')) {
    content = content.replace(
      `import { Users, LogOut, Wrench, X } from 'lucide-react';`,
      `import { Users, LogOut, Wrench, X, FileText } from 'lucide-react';`
    );
  }
}

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log("Patched Sidebar2");
