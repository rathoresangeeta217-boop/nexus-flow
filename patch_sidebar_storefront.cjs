const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

const replacement = `      </nav>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <button
          onClick={() => { window.history.pushState({}, '', '/'); setActiveTab('Storefront'); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Package className="w-4 h-4" />
          View Storefront
        </button>
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-900">`;

content = content.replace(
  `      </nav>\n\n      <div className="p-4 bg-slate-950 border-t border-slate-900">`,
  replacement
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log("Patched sidebar storefront button");
