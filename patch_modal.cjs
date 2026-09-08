const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const customerInfoTarget = `              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

const customerInfoReplacement = `              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Order & Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Order Receiving Date</p>
                      <p className="text-sm font-semibold text-slate-800">{order.date || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quotation Date</p>
                      <p className="text-sm font-semibold text-slate-800">{order.details?.quotationDate || order.date || 'N/A'}</p>
                    </div>
                  </div>`;

if (content.includes(customerInfoTarget)) {
    content = content.replace(customerInfoTarget, customerInfoReplacement);
    fs.writeFileSync(path, content);
    console.log("Updated Customer Info!");
} else {
    console.log("Could not find customerInfoTarget");
}
