const fs = require('fs');
let content = fs.readFileSync('src/components/NewProductModal.tsx', 'utf-8');

content = content.replace(
  "import { X, ShoppingBag, Upload, Image as ImageIcon } from 'lucide-react';",
  "import { X, ShoppingBag, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';"
);

fs.writeFileSync('src/components/NewProductModal.tsx', content);
console.log("Patched loader2");
