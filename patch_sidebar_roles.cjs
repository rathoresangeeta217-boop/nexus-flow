const fs = require('fs');
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf-8');

const roleFilterLogic = `
            {navigation.filter(n => {
              if (n.section !== section) return false;
              if (profile?.role === 'super_admin') return true;
              if (profile?.role === 'admin') {
                return n.name !== 'Analytics';
              }
              if (profile?.role === 'sales_executive') {
                return n.name === 'Orders' || n.name === 'Payments' || n.name === 'Dispatched';
              }
              return false; // employee / viewer logic if needed
            }).map((item) => {
`;

content = content.replace(
  "{navigation.filter(n => n.section === section).map((item) => {",
  roleFilterLogic
);

content = content.replace(
  "{section === 'Analytics' && profile?.role === 'admin' && (",
  "{section === 'Analytics' && profile?.role === 'super_admin' && ("
);

// We should also hide the 'Analytics' section header if it's empty for sales_executive or admin.
// Wait, the map over `['Operations', 'Analytics']` renders the section header regardless.
const sectionMapLogic = `
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {['Operations', 'Analytics'].map((section) => {
          
          const filteredNav = navigation.filter(n => {
            if (n.section !== section) return false;
            if (profile?.role === 'super_admin') return true;
            if (profile?.role === 'admin') return n.name !== 'Analytics';
            if (profile?.role === 'sales_executive') {
              return n.name === 'Orders' || n.name === 'Payments' || n.name === 'Dispatched';
            }
            return false;
          });

          const showUsers = section === 'Analytics' && profile?.role === 'super_admin';

          if (filteredNav.length === 0 && !showUsers) return null;

          return (
          <div key={section} className="mb-4 first:mt-0 mt-6">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              {section}
            </div>
            {filteredNav.map((item) => {
`;

// Replacing everything from `<nav ...>` down to `{filteredNav.map((item) => {`
// Let's do a more surgical replace.

content = content.replace(
  /<nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">[\s\S]*?<div className="p-4 bg-slate-950 border-t border-slate-900">/,
  `      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {['Operations', 'Analytics'].map((section) => {
          const filteredNav = navigation.filter(n => {
            if (n.section !== section) return false;
            if (profile?.role === 'super_admin') return true;
            if (profile?.role === 'admin') return n.name !== 'Analytics';
            if (profile?.role === 'sales_executive') {
              return n.name === 'Orders' || n.name === 'Payments' || n.name === 'Dispatched';
            }
            return false;
          });

          const showUsers = section === 'Analytics' && profile?.role === 'super_admin';

          if (filteredNav.length === 0 && !showUsers) return null;

          return (
            <div key={section} className="mb-4 first:mt-0 mt-6">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
                {section}
              </div>
              {filteredNav.map((item) => {
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveTab(item.name as TabName)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 transition-colors group",
                      isActive 
                        ? "bg-indigo-600/10 border-r-4 border-indigo-500 text-indigo-400 font-medium" 
                        : "text-slate-400 hover:bg-slate-800 font-medium"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="hidden"
                        initial={false}
                      />
                    )}
                    <item.icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors opacity-80",
                      isActive ? "text-indigo-400" : "text-slate-400"
                    )} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {showUsers && (
                 <button
                    onClick={() => setActiveTab('Users' as TabName)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 transition-colors group mt-1",
                      activeTab === 'Users' 
                        ? "bg-indigo-600/10 border-r-4 border-indigo-500 text-indigo-400 font-medium" 
                        : "text-slate-400 hover:bg-slate-800 font-medium"
                    )}
                  >
                    <Users className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors opacity-80",
                      activeTab === 'Users' ? "text-indigo-400" : "text-slate-400"
                    )} />
                    <span>Users</span>
                  </button>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-4 bg-slate-950 border-t border-slate-900">`
);

fs.writeFileSync(file, content);
