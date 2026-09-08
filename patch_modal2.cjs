const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// I want to add calculations before returning the JSX, if paymentRecord is present.
const calcInsertion = `
  const totalReceived = paymentRecord?.phases.filter(p => p.status === 'Received').reduce((sum, p) => {
    return sum + (parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0);
  }, 0) || 0;
  
  const grandTotalParsed = parseFloat(String(paymentRecord?.grandTotal || order.amount || '0').replace(/[^0-9.]/g, '')) || 0;
  const pendingAmount = Math.max(0, grandTotalParsed - totalReceived);
  
  const formatVal = (val) => \\\`₹\\\${val.toLocaleString('en-IN')}\\\`;
  
  let dispatchedCount = 0;
  let pendingDispatchCount = 0;
  if (order.details?.products) {
    order.details.products.forEach(p => {
      const q = Number(p.quantity) || 1;
      const d = Number(p.dispatchedQuantity) || (p.isDispatched ? q : 0);
      dispatchedCount += d;
      pendingDispatchCount += Math.max(0, q - d);
    });
  }
`;

const returnTarget = `  return (
    <AnimatePresence>`;
    
if (!content.includes('totalReceived')) {
  content = content.replace(returnTarget, calcInsertion + '\n' + returnTarget);
}

// Update the payment block to include phases and pending/received
const oldPaymentTarget = `              {paymentRecord && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Financial Overview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.grandTotal || order.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Advance</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.advancePayment || paymentRecord.advanceRequirement || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Transport</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.transportationCharges || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Installation</p>
                      <p className="text-sm font-semibold text-slate-800">{paymentRecord.installationCharges || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}`;

const newPaymentReplacement = `              {paymentRecord && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Financial Overview & Payment Details
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</p>
                      <p className="text-lg font-bold text-slate-800">{paymentRecord.grandTotal || order.amount}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Total Received</p>
                      <p className="text-lg font-bold text-emerald-700">{formatVal(totalReceived)}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total Pending</p>
                      <p className="text-lg font-bold text-amber-700">{formatVal(pendingAmount)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Advance Req.</p>
                      <p className="text-lg font-bold text-slate-800">{paymentRecord.advancePayment || paymentRecord.advanceRequirement || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {paymentRecord.phases && paymentRecord.phases.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Phases</h5>
                      <div className="space-y-3">
                        {paymentRecord.phases.map((phase, idx) => (
                          <div key={phase.id || idx} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{phase.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                {phase.date && <span>{phase.date}</span>}
                                {phase.sourceType && <span>Via {phase.sourceType}</span>}
                                {phase.bankName && <span>({phase.bankName})</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-slate-700">{phase.amount}</span>
                              <Badge variant={phase.status === 'Received' ? 'success' : 'warning'}>
                                {phase.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}`;

if (content.includes(oldPaymentTarget)) {
  content = content.replace(oldPaymentTarget, newPaymentReplacement);
} else {
  console.log("Could not find oldPaymentTarget! I'll try a regex replacement.");
  const oldRegex = /\{paymentRecord && \([\s\S]*?<\/div>\s*\}\)/;
  content = content.replace(oldRegex, newPaymentReplacement);
}

// Now inject dispatched info into the Products section.
const productsTarget = `                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>Products</span>
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {order.details.products.length} Items
                    </span>
                  </h4>`;
                  
const productsReplacement = `                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>Products</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {dispatchedCount} Dispatched
                      </span>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                        {pendingDispatchCount} Pending
                      </span>
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {order.details.products.length} Items
                      </span>
                    </div>
                  </h4>`;

if (content.includes(productsTarget)) {
  content = content.replace(productsTarget, productsReplacement);
  console.log("Updated products header.");
}

fs.writeFileSync(path, content);
console.log("Updated all targets.");
