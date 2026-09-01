import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Upload, CheckCircle2, AlertCircle, Lock, Unlock, Download, Clock, ChevronRight } from 'lucide-react';
import { Order } from '../lib/orders';
import * as XLSX from 'xlsx';
import { PaymentRecord, PaymentPhase, getPaymentForOrder, savePaymentRecord } from '../lib/payments';

interface PaymentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export function PaymentManagementModal({ isOpen, onClose, order }: PaymentManagementModalProps) {
  const [record, setRecord] = useState<Partial<PaymentRecord>>({ phases: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [originalRatesForDiff, setOriginalRatesForDiff] = useState<any>(null);
  const [unlockedPhases, setUnlockedPhases] = useState<Record<string, boolean>>({});
  const [phaseToUnlock, setPhaseToUnlock] = useState<string | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authAction, setAuthAction] = useState<{type: 'editRates' | 'addPhase' | 'unlockPhase', phaseId?: string} | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  useEffect(() => {
    if (isOpen && order) {
      loadPaymentRecord();
    } else {
      setRecord({ phases: [] });
      setIsEditingAmount(false);
      setUnlockedPhases({});
      setPhaseToUnlock(null);
      setAuthPassword('');
      setAuthAction(null);
    }
  }, [isOpen, order]);

  
  const handleAuthSubmit = () => {
    const validPasswords = ['Anshu9785', 'Abhi6462', 'Kushi7608'];
    if (validPasswords.includes(authPassword)) {
      if (authAction?.type === 'editRates') {
        if (!isEditingAmount) {
          setOriginalRatesForDiff({
            grandTotal: record.grandTotal,
            originalAmount: record.originalAmount,
            originalGst: record.originalGst,
            advancePayment: record.advancePayment || record.advanceRequirement,
            transportationCharges: record.transportationCharges || record.loadingCharges,
            installationCharges: record.installationCharges
          });
        } else {
          setRecord({...record, editReason: ''});
        }
        setIsEditingAmount(!isEditingAmount);
      } else if (authAction?.type === 'addPhase') {
        addPhase();
      } else if (authAction?.type === 'unlockPhase' && authAction.phaseId) {
        setUnlockedPhases(prev => ({...prev, [authAction.phaseId]: true}));
      }
      setAuthAction(null);
      setAuthPassword('');
    } else {
      alert('Incorrect password! You are not authorized.');
    }
  };

  const loadPaymentRecord = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const existing = await getPaymentForOrder(order.id);
      if (existing) {
        setRecord(existing);
      } else {
        // Calculate GST Amount based on rate
        // Extract the numerical value (Grand Total) from the order amount using regex to ignore "Rs." dots
        const match = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
        const grandTotalValue = match ? parseFloat(match[0].replace(/,/g, "")) : 0;
        
        let gstRate = 18; // Default 18%
        if (order.details?.gst) {
          const gstStr = order.details.gst.toString();
          const percentMatch = gstStr.match(/(\d+(?:\.\d+)?)\s*%/);
          if (percentMatch) {
            gstRate = parseFloat(percentMatch[1]);
          } else {
            // Check if it's just a standard tax rate number (5, 12, 18, 28)
            const numMatch = gstStr.match(/^\s*(5|12|18|28)\s*$/);
            if (numMatch) {
              gstRate = parseFloat(numMatch[1]);
            }
          }
        }
        
        // Reverse calculate Subtotal and GST based on the assumption that order amount is the Grand Total
        const subtotalValue = grandTotalValue / (1 + (gstRate / 100));
        const gstAmountValue = grandTotalValue - subtotalValue;

        // Initialize new record from order
        setRecord({
          orderId: order.id,
          originalAmount: `₹${subtotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          originalGst: `₹${gstAmountValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${gstRate}%)`, 
          grandTotal: `₹${grandTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
          advancePayment: order.details?.advancePayment || "",
          transportationCharges: order.details?.transportationCharges || "",
          installationCharges: order.details?.installationCharges || "",
          phases: []
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

    const handleSave = async () => {
    if (isEditingAmount && !record.editReason) {
      alert("Please provide a valid reason for editing the amount.");
      return;
    }

    let recordToSave = { ...record };

    if (isEditingAmount && record.editReason && originalRatesForDiff) {
      const changes: string[] = [];
      const currentAdvance = record.advancePayment || record.advanceRequirement;
      const currentTransport = record.transportationCharges || record.loadingCharges;
      
      const formatStr = (val: any) => (val || '₹0').toString();

      if (formatStr(originalRatesForDiff.originalAmount) !== formatStr(record.originalAmount)) {
        changes.push(`Subtotal: ${formatStr(originalRatesForDiff.originalAmount)} -> ${formatStr(record.originalAmount)}`);
      }
      if (formatStr(originalRatesForDiff.originalGst) !== formatStr(record.originalGst)) {
        changes.push(`GST: ${formatStr(originalRatesForDiff.originalGst)} -> ${formatStr(record.originalGst)}`);
      }
      if (formatStr(originalRatesForDiff.grandTotal) !== formatStr(record.grandTotal)) {
        changes.push(`Grand Total: ${formatStr(originalRatesForDiff.grandTotal)} -> ${formatStr(record.grandTotal)}`);
      }
      if (formatStr(originalRatesForDiff.advancePayment) !== formatStr(currentAdvance)) {
        changes.push(`Advance Payment: ${formatStr(originalRatesForDiff.advancePayment)} -> ${formatStr(currentAdvance)}`);
      }
      if (formatStr(originalRatesForDiff.transportationCharges) !== formatStr(currentTransport)) {
        changes.push(`Transportation: ${formatStr(originalRatesForDiff.transportationCharges)} -> ${formatStr(currentTransport)}`);
      }
      if (formatStr(originalRatesForDiff.installationCharges) !== formatStr(record.installationCharges)) {
        changes.push(`Installation: ${formatStr(originalRatesForDiff.installationCharges)} -> ${formatStr(record.installationCharges)}`);
      }

      if (changes.length > 0) {
        const newHistoryEntry = {
          timestamp: new Date().toISOString(),
          reason: record.editReason,
          changes
        };
        recordToSave.rateEditHistory = [...(record.rateEditHistory || []), newHistoryEntry];
      }
      
      recordToSave.editReason = ''; // Clear reason after tracking
    }
        
    setIsLoading(true);
    try {
      await savePaymentRecord(recordToSave as PaymentRecord);
      setIsEditingAmount(false);
      onClose();
    } catch (error) {
      console.error(error);
      alert(`Failed to save payment record. ${error instanceof Error ? error.message : "Check console for details."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addPhase = () => {
    const newPhase: PaymentPhase = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      amount: '',
      status: 'Pending'
    };
    setRecord({ ...record, phases: [...(record.phases || []), newPhase] });
  };

  const updatePhase = (id: string, updates: Partial<PaymentPhase>) => {
    if (updates.status === 'Received') {
      setUnlockedPhases(prev => ({ ...prev, [id]: true }));
    }
    const updatedPhases = record.phases?.map(p => p.id === id ? { ...p, ...updates } : p) || [];
    setRecord({ ...record, phases: updatedPhases });
  };

  const removePhase = (id: string) => {
    const updatedPhases = record.phases?.filter(p => p.id !== id) || [];
    setRecord({ ...record, phases: updatedPhases });
  };


    const handleDownloadReport = () => {
    if (!order) return;
    try {
      const paymentsData = [];
      const historyData = [];
      
      const customerName = order.customer;
      const totalAmount = order.amount;
      
      if (record.phases && record.phases.length > 0) {
        record.phases.forEach((phase, index) => {
          paymentsData.push({
            "Order ID": order.id,
            "Customer": customerName,
            "Total Amount": totalAmount,
            "Phase Title": phase.title || `Phase ${index + 1}`,
            "Phase Amount": phase.amount || '',
            "Status": phase.status || '',
            "Date": phase.date ? new Date(phase.date).toLocaleString('en-IN') : '',
            "Source Type": phase.sourceType || '',
            "Bank Name": phase.bankName || '',
            "UTR Number": phase.utrNumber || ''
          });
        });
      } else {
        paymentsData.push({
          "Order ID": order.id,
          "Customer": customerName,
          "Total Amount": totalAmount,
          "Phase Title": "No phases defined",
          "Phase Amount": "-",
          "Status": "-",
          "Date": "-",
          "Source Type": "-",
          "Bank Name": "-",
          "UTR Number": "-"
        });
      }
      
      if (record.rateEditHistory && record.rateEditHistory.length > 0) {
        record.rateEditHistory.forEach(entry => {
          historyData.push({
            "Order ID": order.id,
            "Customer": customerName,
            "Date Modified": new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            "Reason": entry.reason,
            "Changes": entry.changes.join(' | ')
          });
        });
      }
      
      const wb = XLSX.utils.book_new();
      
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payment Phases");
      
      if (historyData.length > 0) {
        const wsHistory = XLSX.utils.json_to_sheet(historyData);
        XLSX.utils.book_append_sheet(wb, wsHistory, "Rate Modification History");
      } else {
        const wsHistory = XLSX.utils.json_to_sheet([{"Note": "No rate modifications found."}]);
        XLSX.utils.book_append_sheet(wb, wsHistory, "Rate Modification History");
      }
      
      XLSX.writeFile(wb, `Payment_Report_${order.id}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    }
  };

  const handleScreenshotUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updatePhase(id, { screenshotUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Manage Payments</h2>
              <p className="text-sm text-slate-500">Order: {order.id} - {order.customer}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownloadReport} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" />
                Report
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>


          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-8">
            
            {/* Rates & Amounts Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Order Financials</h3>
                <button 
                  onClick={() => {
                  if (isEditingAmount) {
                    setRecord({...record, editReason: ''});
                    setIsEditingAmount(false);
                  } else {
                    setAuthAction({ type: 'editRates' });
                  }
                }} 
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {isEditingAmount ? 'Cancel Edit' : 'Edit Rates'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Original Subtotal (Without GST)</label>
                  <input 
                    type="text" 
                    value={record.originalAmount || ''} 
                     onChange={(e) => setRecord({...record, originalAmount: e.target.value})}
                    disabled={!isEditingAmount}
                    className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditingAmount ? 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">GST / Taxes</label>
                  <input 
                    type="text" 
                    value={record.originalGst || ''} 
                     onChange={(e) => setRecord({...record, originalGst: e.target.value})}
                    disabled={!isEditingAmount}
                    className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditingAmount ? 'bg-white text-slate-800 border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Grand Total</label>
                  <input 
                    type="text" 
                    value={record.grandTotal || ''} 
                     onChange={(e) => setRecord({...record, grandTotal: e.target.value})}
                    disabled={!isEditingAmount}
                    className={`w-full px-3 py-2 border rounded-lg font-bold outline-none ${isEditingAmount ? 'bg-white border-indigo-300 text-indigo-900 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                  />
                </div>
                
                {isEditingAmount && (
  <>
                    <div className="md:col-span-3 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-amber-800">Editing Rates</h4>
                          <p className="text-xs text-amber-700 mt-0.5">You have unlocked the rate fields. A valid reason is required if you are making changes.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Reason for Change *</label>
                          <input 
                            type="text" 
                            value={record.editReason || ''} 
                            onChange={(e) => setRecord({...record, editReason: e.target.value})}
                            placeholder="e.g. Customer negotiated discount, added installation"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${(!record.editReason || !record.editReason.trim()) ? 'border-red-300 bg-red-50' : 'border-slate-300'}`} 
                          />
                        </div>
                      </div>
                    </div>
  </>
)}
                
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Payment</label>
                    <input 
                      type="text" 
                      value={record.advancePayment || record.advanceRequirement || ''} 
                       onChange={(e) => setRecord({...record, advancePayment: e.target.value})}
                      placeholder="₹0"
                      disabled={!isEditingAmount}
                      className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditingAmount ? 'bg-white border-indigo-300 text-slate-800 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Transportation Charges</label>
                    <input 
                      type="text" 
                      value={record.transportationCharges || record.loadingCharges || ''} 
                       onChange={(e) => setRecord({...record, transportationCharges: e.target.value})}
                      placeholder="₹0"
                      disabled={!isEditingAmount}
                      className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditingAmount ? 'bg-white border-indigo-300 text-slate-800 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Installation Charges</label>
                    <input 
                      type="text" 
                      value={record.installationCharges || ''} 
                       onChange={(e) => setRecord({...record, installationCharges: e.target.value})}
                      placeholder="₹0"
                      disabled={!isEditingAmount}
                      className={`w-full px-3 py-2 border rounded-lg outline-none ${isEditingAmount ? 'bg-white border-indigo-300 text-slate-800 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'}`} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 mb-1">Remaining Balance</label>
                    <div className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-bold flex items-center justify-between">
                      <span>{(() => {
                        const parseVal = (str: string | undefined, baseTotal: number = 0) => {
                           if (!str) return 0;
                           const strVal = str.toString();
                           const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
                           if (pctMatch && baseTotal > 0) {
                              const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
                              return (pct / 100) * baseTotal;
                           }
                           const match = strVal.match(/\d[\d,]*(\.\d+)?/);
                           return match ? parseFloat(match[0].replace(/,/g, "")) || 0 : 0;
                        };
                        const grandTotal = parseVal(record.grandTotal);
                        const advance = parseVal(record.advancePayment || record.advanceRequirement, grandTotal);
                        const transport = parseVal(record.transportationCharges || record.loadingCharges, grandTotal);
                        const install = parseVal(record.installationCharges, grandTotal);
                        
                        let receivedPhasesTotal = 0;
                        (record.phases || []).forEach(p => {
                          if (p.status === 'Received') {
                            receivedPhasesTotal += parseVal(p.amount, grandTotal);
                          }
                        });
                        const remaining = (grandTotal + transport + install) - receivedPhasesTotal;
                        return remaining >= 0 ? `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `-₹${Math.abs(remaining).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                      })()}</span>
                    </div>
                  </div>
                
            {record.rateEditHistory && record.rateEditHistory.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Rate Modification History</h4>
                <div className="space-y-3">
                  {record.rateEditHistory.map((entry: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 border border-slate-200 rounded-md shadow-sm">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium mb-2">
                        Reason: <span className="font-normal italic text-slate-600">{entry.reason}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {entry.changes.map((change: string, cIdx: number) => (
                          <span key={cIdx} className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
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
              </div>
            </section>

            <hr className="border-slate-200" />

            
            {/* Rate Edit History */}
            {record.rateEditHistory && record.rateEditHistory.length > 0 && (
              <section className="space-y-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-slate-700 font-semibold text-lg hover:text-indigo-600 transition-colors w-full text-left"
                >
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Price Change History
                  <ChevronRight className={`w-5 h-5 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pl-7 border-l-2 border-slate-100 ml-2 py-2">
                        {[...record.rateEditHistory].reverse().map((entry, index) => (
                          <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                              <span>{new Date(entry.timestamp).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="font-medium text-slate-800 mb-1">Reason: {entry.reason}</div>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-xs">
                              {entry.changes.map((change, i) => (
                                <li key={i}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Payment Phases Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Payment Phases</h3>
                <button 
                  onClick={() => setAuthAction({ type: 'addPhase' })}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Phase
                </button>
              </div>
              
              {record.phases?.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                  <p className="text-sm text-slate-500">No payment phases defined yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {record.phases?.map((phase, index) => (
                    <div key={`${phase.id || 'k'}-${index}`} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-slate-700">Phase {index + 1}</h4>
                          {phase.status === 'Received' && !unlockedPhases[phase.id] && (
                            <button onClick={() => setAuthAction({ type: 'unlockPhase', phaseId: phase.id })} className="text-xs flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 hover:bg-amber-100">
                              <Lock className="w-3 h-3" /> Locked
                            </button>
                          )}
                          {unlockedPhases[phase.id] && (
                            <span className="text-xs flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              <Unlock className="w-3 h-3" /> Unlocked
                            </span>
                          )}
                        </div>
                        
                      </div>
                      
                      
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Phase Description</label>
                          <input 
                            type="text" 
                            value={phase.title} 
                            onChange={(e) => updatePhase(phase.id, { title: e.target.value })}
                            disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                            placeholder="e.g. 50% Advance or After 25 days"
                            className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Amount / Percentage</label>
                          <input 
                            type="text" 
                            value={phase.amount} 
                            onChange={(e) => updatePhase(phase.id, { amount: e.target.value })}
                            disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                            placeholder="e.g. ₹25,000 or 20%"
                            className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                          <select 
                            value={phase.status}
                            onChange={(e) => updatePhase(phase.id, { status: e.target.value as any })}
                            disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                            className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Received">Received</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Expected / Received Date</label>
                          <input 
                            type="date" 
                            value={phase.date || ''} 
                            onChange={(e) => updatePhase(phase.id, { date: e.target.value })}
                            disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                            className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} 
                          />
                        </div>
                        
                        {phase.status === 'Received' && (
                          <>
                            <div className="md:col-span-2 pt-2 border-t border-slate-200">
                              <h5 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">Payment Source / Proof</h5>
                              <div className={`grid grid-cols-1 md:grid-cols-${phase.sourceType === 'Bank' ? '4' : '3'} gap-4`}>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Type</label>
                                  <select 
                                    value={phase.sourceType || ''}
                                    onChange={(e) => updatePhase(phase.id, { sourceType: e.target.value as any })}
                                    disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                    className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                  >
                                    <option value="">Select Source</option>
                                    <option value="Bank">Bank</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                  </select>
                                </div>
                                {phase.sourceType === 'Bank' && (
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                                    <select 
                                      value={phase.bankName || ''}
                                      onChange={(e) => updatePhase(phase.id, { bankName: e.target.value as any })}
                                      disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                      className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`}
                                    >
                                      <option value="">Select Bank</option>
                                      <option value="SBI">SBI</option>
                                      <option value="Union">Union</option>
                                      <option value="PR">PR</option>
                                    </select>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">UTR Number / Ref ID</label>
                                  <input 
                                    type="text" 
                                    value={phase.utrNumber || ''} 
                                    onChange={(e) => updatePhase(phase.id, { utrNumber: e.target.value })}
                                    disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                    placeholder="Enter UTR or Transaction ID"
                                    className={`w-full px-3 py-2 border rounded-lg outline-none ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} 
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Screenshot</label>
                                  {phase.screenshotUrl ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => setViewImage(phase.screenshotUrl || null)} className="block w-12 h-12 rounded border border-slate-300 overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity" title="Click to view full image">
                                        <img src={phase.screenshotUrl} alt="Proof" className="w-full h-full object-cover" />
                                      </button>
                                      <div className="flex flex-col items-start gap-1.5">
                                        <button type="button" onClick={() => setViewImage(phase.screenshotUrl || null)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline">View Full Image</button>
                                        <button type="button" onClick={() => updatePhase(phase.id, { screenshotUrl: undefined })} disabled={phase.status === 'Received' && !unlockedPhases[phase.id]} className="text-xs text-rose-500 hover:text-rose-700 underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">Remove</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleScreenshotUpload(phase.id, e)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                      />
                                      <div className="w-full px-3 py-2 border border-slate-300 border-dashed rounded-lg bg-white flex items-center justify-center text-xs text-slate-500 hover:bg-slate-50">
                                        <Upload className="w-4 h-4 mr-2" /> Upload Screenshot
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || (isEditingAmount && (!record.editReason || !record.editReason.trim()))}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save Payment Details
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      
      {authAction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Employee Authorization</h3>
              <button onClick={() => { setAuthAction(null); setAuthPassword(''); }} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Enter your password</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Password"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">Only authorized employees can edit payment details.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setAuthAction(null); setAuthPassword(''); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleAuthSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                  Verify
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4" onClick={() => setViewImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 bg-slate-800 rounded-full" onClick={() => setViewImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={viewImage} alt="Full Proof" className="max-w-full max-h-[90vh] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

    </AnimatePresence>
  );
}
