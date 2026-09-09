const fs = require('fs');
let content = fs.readFileSync('src/tabs/StorefrontTab.tsx', 'utf8');
content = content.replace(
  `import { ProductImage } from '../components/ProductImage'; // We'll need to extract this or build a simple one`,
  `// custom image component defined at bottom of file`
);
fs.writeFileSync('src/tabs/StorefrontTab.tsx', content);
