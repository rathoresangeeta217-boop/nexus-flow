const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const attachmentsMarker = `              {/* Attachments */}`;

const productsBlock = `
              {order.details?.products && order.details.products.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
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
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className="divide-y divide-slate-100">
                      {order.details.products.map((p, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-800 truncate">{p.name || 'Unknown Product'}</h4>
                            {p.size && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.size}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {p.rate && (
                                <span className="text-xs text-slate-500">Rate: {p.rate}</span>
                              )}
                              {p.amount && (
                                <span className="text-xs text-slate-500 font-medium text-slate-700">Total: {p.amount}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                            <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                              Qty: {p.quantity || 1}
                            </span>
                            {p.isDispatched && (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                Dispatched: {p.dispatchedQuantity || p.quantity || 1}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
`;

if (content.includes(attachmentsMarker) && !content.includes('{order.details?.products && order.details.products.length > 0')) {
  content = content.replace(attachmentsMarker, productsBlock + attachmentsMarker);
  fs.writeFileSync(path, content);
  console.log("Successfully restored Products block.");
} else {
  console.log("Could not find attachments marker or products block already exists.");
}

