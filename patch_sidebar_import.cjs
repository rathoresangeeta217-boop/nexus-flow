const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!content.includes('FileText')) {
  content = content.replace(
    `import { Users, LogOut, Wrench, X } from 'lucide-react';`,
    `import { Users, LogOut, Wrench, X, FileText } from 'lucide-react';`
  );
  fs.writeFileSync('src/components/Sidebar.tsx', content);
  console.log("Patched Sidebar import");
} else {
  console.log("FileText already present or something else happened");
}
