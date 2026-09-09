const fs = require('fs');
let content = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');
content = content.replace(
  `import { ShoppingCart, ShoppingBag, Factory, Truck, CreditCard, BarChart3, Wrench, Users } from 'lucide-react';`,
  `import { ShoppingCart, ShoppingBag, Factory, Truck, CreditCard, BarChart3, Wrench, Users, FileText } from 'lucide-react';`
);
content = content.replace(
  `  { name: 'Purchase', icon: ShoppingBag },`,
  `  { name: 'Purchase', icon: ShoppingBag },\n  { name: 'Quotations', icon: FileText },`
);
content = content.replace(
  `if (profile?.role === 'admin') return n.name !== 'Analytics' && n.name !== 'Users';`,
  `if (profile?.role === 'admin') return n.name !== 'Analytics' && n.name !== 'Users';`
);

fs.writeFileSync('src/components/BottomNav.tsx', content);
console.log("Patched BottomNav.tsx");
