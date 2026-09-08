const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { BottomNav }')) {
  content = content.replace(
    "import { Sidebar } from './components/Sidebar';",
    "import { Sidebar } from './components/Sidebar';\nimport { BottomNav } from './components/BottomNav';"
  );
}

// Remove mobile menu states since we don't need them
content = content.replace('const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);', '');
content = content.replace('setIsMobileMenuOpen(false);', '');

// Update Sidebar and main layout
const layoutTarget = `<div className="flex h-[100dvh] bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />`;

const layoutReplacement = `<div className="flex h-[100dvh] bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="hidden lg:flex shrink-0">
        <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />
      </div>
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />`;

if (content.includes(layoutTarget)) {
  content = content.replace(layoutTarget, layoutReplacement);
} else {
  // Try matching without [100dvh] if it wasn't replaced properly
  const layoutTarget2 = `<div className="flex h-[100dvh] bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />`;
        
  // If it still has h-screen
  const layoutTarget3 = `<div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={currentTab} setActiveTab={setActiveTab} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />`;
        
  if (content.includes(layoutTarget3)) {
     content = content.replace(layoutTarget3, layoutReplacement);
  }
}

// Add pb-20 to main and insert BottomNav
const mainTarget = `<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">`;
const mainReplacement = `<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 custom-scrollbar">`;

if (content.includes(mainTarget)) {
  content = content.replace(mainTarget, mainReplacement);
}

const endTarget = `</main>
      </div>
    </div>`;
const endReplacement = `</main>
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200">
          <BottomNav activeTab={currentTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>`;
if (content.includes(endTarget)) {
  content = content.replace(endTarget, endReplacement);
}

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with BottomNav.");
