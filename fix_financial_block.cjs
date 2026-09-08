const fs = require('fs');
const path = 'src/components/OrderDetailsModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to locate the start of the financial block
const startMarker = `              {/* Financial Overview */}`;
const endMarker = `              {/* Attachments */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const blockBefore = content.substring(0, startIndex);
  const blockAfter = content.substring(endIndex);
  
  const newFinancialBlock = `              {/* Financial Overview */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Financial Overview & Payment Details
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</p>
                    <p className="text-lg font-bold text-slate-800">{paymentRecord?.grandTotal || order.amount || order.details?.totalAmount || '0'}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-sm">
                    <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Total Received</p>
                    <p className="text-lg font-bold text-emerald-700">{formatVal(totalReceived)}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total Pending</p>
                    <p className="text-lg font-bold text-amber-700">{formatVal(pendingAmount)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Advance Req.</p>
                    <p className="text-lg font-bold text-slate-800">{paymentRecord?.advancePayment || paymentRecord?.advanceRequirement || order.details?.advancePayment || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Transport Charges</p>
                    <p className="text-sm font-semibold text-slate-800">{paymentRecord?.transportationCharges || paymentRecord?.loadingCharges || order.details?.transportationCharges || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Installation</p>
                    <p className="text-sm font-semibold text-slate-800">{paymentRecord?.installationCharges || order.details?.installationCharges || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                     <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bank Details</p>
                     <p className="text-sm font-semibold text-slate-800">{order.details?.bankDetails || 'N/A'}</p>
                  </div>
                </div>
                
                {paymentRecord?.phases && paymentRecord.phases.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Phases</h5>
                    <div className="space-y-3">
                      {paymentRecord.phases.map((phase, idx) => (
                        <div key={phase.id || idx} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
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
                
                {paymentRecord?.rateEditHistory && paymentRecord.rateEditHistory.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-bold text-slate-800">Rate Modification History</h4>
                    </div>
                    <div className="space-y-3">
                      {[...paymentRecord.rateEditHistory].reverse().map((entry, idx) => (
                        <div key={\`\${entry.timestamp}-\${idx}\`} className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 font-medium mb-2">
                            Reason: <span className="font-normal italic text-slate-600">{entry.reason}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {entry.changes.map((change, cIdx) => (
                              <span key={\`change-\${cIdx}\`} className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
                                {change}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

`;
  
  content = blockBefore + newFinancialBlock + blockAfter;
  fs.writeFileSync(path, content);
  console.log("Successfully replaced financial block.");
} else {
  console.log("Could not find markers.", startIndex, endIndex);
}

