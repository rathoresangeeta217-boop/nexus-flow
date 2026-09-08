const fs = require('fs');

// Revert Header
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');
header = header.replace(
  'export function Header({ activeTab, searchQuery, onSearchChange, toggleMobileMenu }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void, toggleMobileMenu?: () => void }) {',
  'export function Header({ activeTab, searchQuery, onSearchChange }: { activeTab: TabName, searchQuery?: string, onSearchChange?: (val: string) => void }) {'
);
header = header.replace(
  '<button onClick={toggleMobileMenu} className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700">',
  '<button className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700 hidden">'
); // just hide it
fs.writeFileSync('src/components/Header.tsx', header);

// Revert Sidebar
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  'export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: { activeTab: TabName, setActiveTab: (tab: TabName) => void, isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {',
  'export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {'
);

const backdropTarget = `<>
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
const backdropRep = `<div className="w-64 bg-slate-900 flex flex-col h-full shrink-0 shadow-xl">`;

if (sidebar.includes(backdropTarget)) {
  sidebar = sidebar.replace(backdropTarget, backdropRep);
}

const closeTarget = `{setIsOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}`;
sidebar = sidebar.replace(closeTarget, '');

const endTarget = `    </div>
    </>
  );`;
const endRep = `    </div>
  );`;
sidebar = sidebar.replace(endTarget, endRep);

sidebar = sidebar.replace(
  'onClick={() => { setActiveTab(item.name as TabName); setIsOpen && setIsOpen(false); }}',
  'onClick={() => setActiveTab(item.name as TabName)}'
);
sidebar = sidebar.replace(
  "onClick={() => { setActiveTab('Users' as TabName); setIsOpen && setIsOpen(false); }}",
  "onClick={() => setActiveTab('Users' as TabName)}"
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
console.log("Reverted mobile states in Sidebar and Header");

