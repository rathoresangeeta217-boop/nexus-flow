const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

if (!content.includes('import { LogOut }')) {
  content = content.replace(
    "import { Bell, Search, UserCircle, Menu, Command, Package } from 'lucide-react';",
    "import { Bell, Search, UserCircle, Menu, Command, Package, LogOut } from 'lucide-react';"
  );
}

if (!content.includes('const { profile } = useAuth();')) {
  // It uses profile, let's grab user and signOut
} else {
  content = content.replace(
    'const { profile } = useAuth();',
    'const { profile, user, signOut } = useAuth();'
  );
}

const dropdownRefLine = `const dropdownRef = useRef<HTMLDivElement>(null);`;
const additionalStates = `const dropdownRef = useRef<HTMLDivElement>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);`;

if (content.includes(dropdownRefLine) && !content.includes('showUserMenu')) {
  content = content.replace(dropdownRefLine, additionalStates);
}

// Update click outside
const oldClickOutside = `    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }`;
const newClickOutside = `    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }`;
if (content.includes(oldClickOutside)) {
  content = content.replace(oldClickOutside, newClickOutside);
}

// Add user menu before closing tag of header flex right side
const endHeader = `        {profile?.role === 'super_admin' && (`;
const userMenuHTML = `        
        <div className="relative lg:hidden" ref={userMenuRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 font-bold overflow-hidden border-2 border-transparent hover:border-indigo-200 transition-colors"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.displayName?.charAt(0).toUpperCase() || 'U'
            )}
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-800 truncate">{profile?.displayName}</p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
              </div>
              <div className="p-1">
                <button 
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
        
        {profile?.role === 'super_admin' && (`;

if (content.includes(endHeader) && !content.includes('userMenuRef')) {
  content = content.replace(endHeader, userMenuHTML);
}

fs.writeFileSync('src/components/Header.tsx', content);
console.log("Patched header user menu.");
