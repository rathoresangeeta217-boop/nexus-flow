const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetSidebar = `      <div className="hidden lg:flex shrink-0">
        <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />
      </div>`;

const newSidebar = `      {currentTab !== 'Storefront' && (
        <div className="hidden lg:flex shrink-0">
          <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />
        </div>
      )}`;

content = content.replace(targetSidebar, newSidebar);

// Also we should hide the BottomNav if it's there
const targetBottomNav = `<BottomNav activeTab={currentTab} setActiveTab={setActiveTab} />`;
const newBottomNav = `{currentTab !== 'Storefront' && <BottomNav activeTab={currentTab} setActiveTab={setActiveTab} />}`;
if (content.includes(targetBottomNav)) {
    content = content.replace(targetBottomNav, newBottomNav);
}

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
