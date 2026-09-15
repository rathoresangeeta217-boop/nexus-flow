const fs = require('fs');
let content = fs.readFileSync('src/tabs/PaymentsTab.tsx', 'utf-8');

const oldFilters = `          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
            </button>
          </div>`;

const newFilters = `          <div className="flex gap-2 items-center">
            {activeTab === 'customer' && (
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Orders</option>
                <option value="unpaid">Unpaid Orders Only</option>
              </select>
            )}
            <button className="hidden px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
            </button>
          </div>`;

content = content.replace(oldFilters, newFilters);

fs.writeFileSync('src/tabs/PaymentsTab.tsx', content);
console.log("Patched filter UI");
