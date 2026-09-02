const fs = require('fs');
const file = 'src/components/DispatchView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  '<p className="text-sm text-slate-500 font-medium mt-1">Customer: {order.customer}</p>',
  `<div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500 font-medium">Customer: {order.customer}</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'Payments', search: order.customer } }))}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
            >
              View Payments
            </button>
          </div>`
);

fs.writeFileSync(file, content);
