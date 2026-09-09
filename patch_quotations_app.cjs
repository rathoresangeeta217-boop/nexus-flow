const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `{currentTab === 'Quotations' && (profile.role === 'super_admin' || profile.role === 'admin') && <QuotationsTab searchQuery={searchQuery} />}`,
  `{currentTab === 'Quotations' && (profile.role === 'super_admin' || profile.role === 'admin') && <QuotationsTab searchQuery={searchQuery} setActiveTab={setActiveTab} />}`
);

fs.writeFileSync('src/App.tsx', content);

let quoteContent = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf8');
quoteContent = quoteContent.replace(
  `export function QuotationsTab({ searchQuery = '' }: { searchQuery?: string }) {`,
  `export function QuotationsTab({ searchQuery = '', setActiveTab }: { searchQuery?: string, setActiveTab?: (tab: any) => void }) {`
);
quoteContent = quoteContent.replace(
  `onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'Purchase' }))}`,
  `onClick={() => setActiveTab?.('Purchase')}`
);
fs.writeFileSync('src/tabs/QuotationsTab.tsx', quoteContent);

console.log("Patched QuotationsTab routing");
