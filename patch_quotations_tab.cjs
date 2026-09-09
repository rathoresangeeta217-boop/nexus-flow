const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf8');

content = content.replace(
  `                      <Badge 
                        variant={quote.status === 'submitted' ? 'success' : 'warning'}
                        icon={quote.status === 'submitted' ? CheckCircle2 : Clock}
                      >`,
  `                      <Badge 
                        variant={quote.status === 'submitted' ? 'success' : 'warning'}
                      >`
);

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
console.log("Patched QuotationsTab.tsx");
