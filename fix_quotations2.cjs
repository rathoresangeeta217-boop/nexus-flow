const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf-8');

// The string in the file has a different number of spaces or something.
content = content.replace(/<\/div>\s*<NewProductModal/g, '<NewProductModal');

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
