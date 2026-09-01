const fs = require('fs');
const file = 'src/components/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "import { cn } from '../lib/utils';",
  "import { cn } from '../lib/utils';\nimport { useAuth } from '../contexts/AuthContext';\nimport { Users, LogOut } from 'lucide-react';"
);

content = content.replace(
  "export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {",
  "export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabName, setActiveTab: (tab: TabName) => void }) {\n  const { user, profile, signOut } = useAuth();"
);

// We need to inject the Users tab dynamically since it's conditional.
// Let's modify the navigation rendering logic.
content = content.replace(
  "{navigation.filter(n => n.section === section).map((item) => {",
  `{navigation.filter(n => n.section === section).map((item) => {
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
            
            {section === 'Analytics' && profile?.role === 'admin' && (
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
            )}`
);

// Only keep one replacement!
const toReplace = `{navigation.filter(n => n.section === section).map((item) => {
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
            })}`;
            
// Wait, the string above might have different spaces. Instead of exact string replacement, let's just use regex for the user profile area.

content = content.replace(
  /<div className="p-4 bg-slate-950">[\s\S]*?<\/div>\s*<\/div>\s*\);\s*\}/,
  `<div className="p-4 bg-slate-950 border-t border-slate-900">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 font-bold overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.displayName?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="overflow-hidden text-left flex-1">
              <p className="text-xs text-white font-medium truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}`
);

fs.writeFileSync(file, content);
