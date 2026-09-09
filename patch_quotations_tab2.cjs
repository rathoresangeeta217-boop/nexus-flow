const fs = require('fs');
let content = fs.readFileSync('src/tabs/QuotationsTab.tsx', 'utf8');

if (!content.includes('Package')) {
  content = content.replace(
    `import { Clock, CheckCircle2 } from 'lucide-react';`,
    `import { Clock, CheckCircle2, Package } from 'lucide-react';`
  );
}

content = content.replace(
  `        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quotations</h2>
          <p className="text-slate-500 mt-1">Manage vendor quotes and RFQs</p>
        </div>
      </div>`,
  `        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quotations</h2>
          <p className="text-slate-500 mt-1">Manage vendor quotes and RFQs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'Purchase' }))}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Products
          </button>
        </div>
      </div>`
);

fs.writeFileSync('src/tabs/QuotationsTab.tsx', content);
console.log("Patched QuotationsTab.tsx top right corner");
