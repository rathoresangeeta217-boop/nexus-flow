const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

content = content.replace("LogOut, Wrench, X, FileText } from 'lucide-react';", "LogOut, Wrench, X, FileText, Package } from 'lucide-react';");
content = content.replace("{ name: 'Purchase', icon: ShoppingBag, section: 'Operations' },", "{ name: 'Purchase', icon: ShoppingBag, section: 'Operations' },\n  { name: 'Products', icon: Package, section: 'Operations' },");

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log("Patched sidebar");
