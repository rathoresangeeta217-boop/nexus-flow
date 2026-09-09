const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `<Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />`,
  `{currentTab !== 'Storefront' && <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />}`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx to hide Header on Storefront");
