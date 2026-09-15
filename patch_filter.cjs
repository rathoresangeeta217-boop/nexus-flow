const fs = require('fs');
let content = fs.readFileSync('src/tabs/OrdersTab.tsx', 'utf-8');

// 1. Add state
content = content.replace(
  "const [statusFilter, setStatusFilter] = useState('all');",
  "const [statusFilter, setStatusFilter] = useState('all');\n  const [salespersonFilter, setSalespersonFilter] = useState('all');"
);

// 2. Add filtering logic
const filterLogic = `  const filteredOrders = orders.filter(order => {
    if (salespersonFilter !== 'all') {
      if (order.details?.employeeName !== salespersonFilter) {
        return false;
      }
    }`;

content = content.replace(
  "  const filteredOrders = orders.filter(order => {",
  filterLogic
);

// 3. Add to UI
const uniqueSalespersonsLogic = `  const uniqueSalesPersons = Array.from(new Set(orders.map(o => o.details?.employeeName).filter(Boolean))).sort();`;
content = content.replace(
  "  const filteredOrders = orders",
  uniqueSalespersonsLogic + "\n\n  const filteredOrders = orders"
);

const uiLogic = `            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >`;

const newUiLogic = `            <select 
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Salespersons</option>
              {uniqueSalesPersons.map((sp) => (
                <option key={sp as string} value={sp as string}>{sp}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >`;

content = content.replace(uiLogic, newUiLogic);

fs.writeFileSync('src/tabs/OrdersTab.tsx', content);
console.log("Patched filters");
