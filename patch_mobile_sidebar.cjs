const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

if (!appContent.includes('isMobileMenuOpen')) {
  appContent = appContent.replace(
    'const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);',
    `const [approvalOrderId, setApprovalOrderId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);`
  );

  appContent = appContent.replace(
    '<Sidebar activeTab={currentTab} setActiveTab={setActiveTab} />',
    '<Sidebar activeTab={currentTab} setActiveTab={setActiveTab} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />'
  );

  appContent = appContent.replace(
    '<Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} />',
    '<Header activeTab={currentTab} searchQuery={searchQuery} onSearchChange={setSearchQuery} toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />'
  );
  
  // Close menu on navigation
  appContent = appContent.replace(
    'setActiveTab(tab);',
    'setActiveTab(tab);\n      setIsMobileMenuOpen(false);'
  );

  fs.writeFileSync('src/App.tsx', appContent);
  console.log("Patched App.tsx");
}

let sidebarContent = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if (!sidebarContent.includes('isOpen?: boolean')) {
  sidebarContent = sidebarContent.replace(
    'export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {',
    'export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: { activeTab: TabName, setActiveTab: (tab: TabName) => void, isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {'
  );
  
  // Also add Close button (lucide-react X)
  if (!sidebarContent.includes('import { X } from')) {
     sidebarContent = sidebarContent.replace(
        "import { Users, LogOut, Wrench } from 'lucide-react';",
        "import { Users, LogOut, Wrench, X } from 'lucide-react';"
     );
  }

  const oldSidebarOuter = `<div className="w-64 bg-slate-900 flex flex-col h-full shrink-0 shadow-xl">`;
  const newSidebarOuter = `    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col h-full shrink-0 shadow-2xl lg:shadow-xl transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>`;

  sidebarContent = sidebarContent.replace(oldSidebarOuter, newSidebarOuter);
  
  // Close tags for the new fragment
  const endDiv = `    </div>
  );`;
  const newEndDiv = `    </div>
    </>
  );`;
  
  sidebarContent = sidebarContent.replace(endDiv, newEndDiv);
  
  // Add mobile close button
  const oldHeader = `<span className="text-white font-bold text-lg tracking-tight uppercase">Modular</span>
        </div>
      </div>`;
  const newHeader = `<span className="text-white font-bold text-lg tracking-tight uppercase">Modular</span>
        </div>
        {setIsOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>`;
      
  sidebarContent = sidebarContent.replace(oldHeader, newHeader);
  
  // Make clicking links close mobile menu
  sidebarContent = sidebarContent.replace(
    'onClick={() => setActiveTab(item.name as TabName)}',
    'onClick={() => { setActiveTab(item.name as TabName); setIsOpen && setIsOpen(false); }}'
  );
  sidebarContent = sidebarContent.replace(
    "onClick={() => setActiveTab('Users' as TabName)}",
    "onClick={() => { setActiveTab('Users' as TabName); setIsOpen && setIsOpen(false); }}"
  );

  fs.writeFileSync('src/components/Sidebar.tsx', sidebarContent);
  console.log("Patched Sidebar.tsx");
}

let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
if (!headerContent.includes('toggleMobileMenu?: () => void')) {
  headerContent = headerContent.replace(
    'export function Header({ activeTab, searchQuery, onSearchChange }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void }) {',
    'export function Header({ activeTab, searchQuery, onSearchChange, toggleMobileMenu }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void, toggleMobileMenu?: () => void }) {'
  );
  
  headerContent = headerContent.replace(
    '<button className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700">',
    '<button onClick={toggleMobileMenu} className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700">'
  );

  fs.writeFileSync('src/components/Header.tsx', headerContent);
  console.log("Patched Header.tsx");
}

