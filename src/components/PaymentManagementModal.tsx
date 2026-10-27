import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Save, Upload, CheckCircle2, AlertCircle, Lock, Unlock, Download, Clock, ChevronRight, Calendar, Check, ShieldAlert, Trash2, Receipt } from 'lucide-react';
import { Order, saveOrder } from '../lib/orders';
import * as XLSX from 'xlsx';
import { PaymentRecord, PaymentPhase, getPaymentForOrder, savePaymentRecord, calculatePhaseGstAdjustment, calculateOrderTotalAmount } from '../lib/payments';
import { generatePaymentReminderPDF } from '../lib/pdfHelper';

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
  const [deliveryDate, setDeliveryDate] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  useEffect(() => {
    if (isOpen && order) {
      loadPaymentRecord();
    } else {
      setRecord({ phases: [] });
      setDeliveryDate('');
      setIsEditingAmount(false);
      setUnlockedPhases({});
      setPhaseToUnlock(null);
      setAuthPassword('');
      setAuthAction(null);
    }
  }, [isOpen, order]);

  
  const handleAuthSubmit = () => {
    let validPasswords = ['Anshu9785', 'Abhi6462', 'Kushi7608'];
    
    if (order?.customer?.toLowerCase().includes('khushboo')) {
      validPasswords.push('use to login', 'USE TO LOGIN', 'usetologin');
    }

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
      const orderIdToUse = order.id || order.docId || '';
      const existing = await getPaymentForOrder(order.id, order.docId, order.customer);
      const initDeliveryDate = existing?.deliveryDate || order.details?.deliveryDate || (order as any).deliveryDate || '';
      setDeliveryDate(initDeliveryDate);

      // Parse order total amount reliably using calculateOrderTotalAmount helper
      const grandTotalValue = calculateOrderTotalAmount(order);

      let gstRate = 18; // Default 18%
      if (order.details?.gst) {
        const gstStr = order.details.gst.toString();
        const percentMatch = gstStr.match(/(\d+(?:\.\d+)?)\s*%/);
        if (percentMatch) {
          gstRate = parseFloat(percentMatch[1]);
        } else {
          const numMatch = gstStr.match(/^\s*(5|12|18|28)\s*$/);
          if (numMatch) {
            gstRate = parseFloat(numMatch[1]);
          }
        }
      }

      const subtotalValue = grandTotalValue > 0 ? grandTotalValue / (1 + (gstRate / 100)) : 0;
      const gstAmountValue = grandTotalValue - subtotalValue;

      const defaultOriginalAmount = grandTotalValue > 0 ? `₹${subtotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';
      const defaultOriginalGst = grandTotalValue > 0 ? `₹${gstAmountValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${gstRate}%)` : '';
      const defaultGrandTotal = grandTotalValue > 0 ? `₹${grandTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';

      let initialPhases: PaymentPhase[] = (existing && existing.phases && existing.phases.length > 0) ? existing.phases : [];

      if (initialPhases.length === 0) {
        const advStr = order.details?.advancePayment || '';
        if (advStr) {
          initialPhases = [
            {
              id: Math.random().toString(36).substring(2, 9),
              title: `Advance Payment (${advStr})`,
              amount: advStr,
              status: 'Pending'
            },
            {
              id: Math.random().toString(36).substring(2, 9),
              title: 'Balance Before Dispatch',
              amount: 'Balance Amount',
              status: 'Pending'
            }
          ];
        } else {
          initialPhases = [
            {
              id: Math.random().toString(36).substring(2, 9),
              title: '50% Advance Payment',
              amount: '50%',
              status: 'Pending'
            },
            {
              id: Math.random().toString(36).substring(2, 9),
              title: '50% Balance Before Dispatch',
              amount: '50%',
              status: 'Pending'
            }
          ];
        }
      }

      if (existing) {
        const hasValidGrand = existing.grandTotal && existing.grandTotal !== '₹0' && existing.grandTotal !== '0';
        const hasValidSub = existing.originalAmount && existing.originalAmount !== '₹0' && existing.originalAmount !== '0';
        
        setRecord({
          ...existing,
          docId: existing.docId,
          orderId: existing.orderId || orderIdToUse,
          originalAmount: hasValidSub ? existing.originalAmount : defaultOriginalAmount,
          originalGst: (existing.originalGst && existing.originalGst !== '₹0') ? existing.originalGst : defaultOriginalGst,
          grandTotal: hasValidGrand ? existing.grandTotal : defaultGrandTotal,
          advancePayment: existing.advancePayment || order.details?.advancePayment || "",
          transportationCharges: existing.transportationCharges || order.details?.transportationCharges || "",
          installationCharges: existing.installationCharges || order.details?.installationCharges || "",
          deliveryDate: initDeliveryDate,
          phases: initialPhases
        });
      } else {
        setRecord({
          orderId: orderIdToUse,
          originalAmount: defaultOriginalAmount,
          originalGst: defaultOriginalGst,
          grandTotal: defaultGrandTotal,
          advancePayment: order.details?.advancePayment || "",
          transportationCharges: order.details?.transportationCharges || "",
          installationCharges: order.details?.installationCharges || "",
          deliveryDate: initDeliveryDate,
          phases: initialPhases
        });
      }
    } catch (error) {
      console.error('Error loading payment record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isEditingAmount && !record.editReason) {
      alert("Please provide a valid reason for editing the amount.");
      return;
    }

    // Auto-fallback for Delivery Date if not filled
    const finalDeliveryDate = deliveryDate.trim() || order?.details?.deliveryDate || (order as any)?.deliveryDate || new Date().toISOString().split('T')[0];
    setDeliveryDate(finalDeliveryDate);

    // Auto-fix phase defaults for received phases so users aren't hard-blocked
    const processedPhases = (record.phases || []).map((p, idx) => {
      const phaseCopy = { ...p };
      
      // Auto-set status to Received if date, UTR, or proof is present
      if ((phaseCopy.date || phaseCopy.utrNumber || phaseCopy.screenshotUrl) && phaseCopy.status === 'Pending') {
        phaseCopy.status = 'Received';
      }

      if (phaseCopy.status === 'Received') {
        if (!phaseCopy.sourceType) {
          phaseCopy.sourceType = 'Bank';
        }
        if (phaseCopy.sourceType === 'Bank' && !phaseCopy.bankName) {
          phaseCopy.bankName = 'PNB';
        }
        if (!phaseCopy.date) {
          phaseCopy.date = new Date().toISOString().split('T')[0];
        }
      }
      return phaseCopy;
    });

    const orderIdToUse = order?.id || order?.docId || record.orderId || '';

    let recordToSave: Partial<PaymentRecord> = { 
      ...record,
      orderId: orderIdToUse,
      docId: record.docId,
      deliveryDate: finalDeliveryDate,
      phases: processedPhases
    };

    const grandTotalVal = calculateOrderTotalAmount(order);
    let gstRate = 18;
    if (order?.details?.gst) {
      const percentMatch = order.details.gst.toString().match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch) gstRate = parseFloat(percentMatch[1]);
    }
    const subtotalVal = grandTotalVal > 0 ? grandTotalVal / (1 + (gstRate / 100)) : 0;
    const gstVal = grandTotalVal - subtotalVal;

    const calcDefaultGrand = grandTotalVal > 0 ? `₹${grandTotalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';
    const calcDefaultSub = grandTotalVal > 0 ? `₹${subtotalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';
    const calcDefaultGst = grandTotalVal > 0 ? `₹${gstVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${gstRate}%)` : '';

    if (!recordToSave.grandTotal || recordToSave.grandTotal === '₹0' || recordToSave.grandTotal === '0') {
      recordToSave.grandTotal = calcDefaultGrand;
    }
    if (!recordToSave.originalAmount || recordToSave.originalAmount === '₹0' || recordToSave.originalAmount === '0') {
      recordToSave.originalAmount = calcDefaultSub;
    }
    if (!recordToSave.originalGst || recordToSave.originalGst === '₹0') {
      recordToSave.originalGst = calcDefaultGst;
    }

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
      
      recordToSave.editReason = '';
    }
        
    setIsLoading(true);
    try {
      const savedDocId = await savePaymentRecord(recordToSave as PaymentRecord);
      
      if (order?.docId || order?.id) {
        await saveOrder({
          docId: order.docId || order.id,
          details: {
            ...(order.details || {}),
            deliveryDate: finalDeliveryDate
          }
        });
        if (order.details) {
          order.details.deliveryDate = finalDeliveryDate;
        }
      }

      // Success notification
      const toast = document.createElement('div');
      toast.textContent = `✅ Payment details saved for ${order.id || order.customer}`;
      toast.className = 'fixed bottom-5 right-5 z-[200] bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl transition-all border border-emerald-500 flex items-center gap-2';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);

      setIsEditingAmount(false);
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(`Failed to save payment record: ${error instanceof Error ? error.message : "Check console for details."}`);
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
    const updatedPhases = record.phases?.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };
      // Auto update status to Received if user selected date, UTR, sourceType, bankName, or uploaded screenshot
      if ((updates.date || updates.utrNumber || updates.sourceType || updates.bankName || updates.screenshotUrl) && updated.status === 'Pending') {
        updated.status = 'Received';
        setUnlockedPhases(prev => ({ ...prev, [id]: true }));
      }
      return updated;
    }) || [];
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
          const isPRorCash = phase.sourceType === 'Cash' || phase.sourceType === 'ICICI BANK' || phase.sourceType === 'ICICI' || (phase.sourceType === 'Bank' && (phase.bankName === 'PR' || phase.bankName === 'PNB' || phase.bankName === 'ICICI' || phase.bankName?.toUpperCase() === 'PNB' || phase.bankName?.toUpperCase() === 'ICICI' || phase.bankName?.toUpperCase() === 'PR'));
          const parseVal = (str: any) => {
            if (!str) return 0;
            const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
            return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
          };
          const grandVal = parseVal(record.grandTotal);
          const adj = calculatePhaseGstAdjustment(phase.amount, phase.sourceType, phase.bankName, 18, grandVal);

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
            "GST Exemption Rule": isPRorCash ? "PNB/ICICI/Cash - GST Excluded" : "Standard GST Applied",
            "GST Subtracted": isPRorCash ? `₹${adj.gstAmount.toFixed(2)}` : "₹0.00",
            "Net Credited Amount": `₹${adj.netCreditedAmount.toFixed(2)}`,
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
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          updatePhase(id, { screenshotUrl: dataUrl });
        };
        img.src = event.target?.result as string;
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
          className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[100dvh] md:max-h-[90vh] flex flex-col"
        >
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Manage Payments</h2>
              <p className="text-sm text-slate-500">Order: {order.id} - {order.customer}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => generatePaymentReminderPDF(order, record)} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                title="Download Payment Reminder Notice PDF"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Payment Reminder</span>
              </button>
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
                    <label className="block text-xs font-bold text-indigo-700 mb-1">Collected / Remaining Balance</label>
                    <div className="w-full px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-xs flex flex-col justify-center">
                      {(() => {
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
                        
                        let receivedPhasesTotal = 0;
                        let totalGstSubtracted = 0;
                        let gstRate = 18;
                        if (record.originalGst) {
                          const m = record.originalGst.match(/(\d+(?:\.\d+)?)\s*%/);
                          if (m) gstRate = parseFloat(m[1]);
                        }
                        (record.phases || []).forEach(p => {
                          if (p.status === 'Received') {
                            receivedPhasesTotal += parseVal(p.amount, grandTotal);
                            const adj = calculatePhaseGstAdjustment(p.amount, p.sourceType, p.bankName, gstRate, grandTotal);
                            totalGstSubtracted += adj.gstAmount;
                          }
                        });
                        const remaining = grandTotal - receivedPhasesTotal - totalGstSubtracted;
                        const remStr = remaining >= 0 ? `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : `-₹${Math.abs(remaining).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                        const recStr = `₹${receivedPhasesTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                        return (
                          <div className="flex items-center justify-between font-bold py-0.5">
                            <span className="text-emerald-700">Rec: {recStr}</span>
                            <span className="text-indigo-900">Rem: {remStr}</span>
                          </div>
                        );
                      })()}
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

            {/* Order Delivery Date Section */}
            <div className="p-4 bg-gradient-to-r from-amber-50 via-white to-indigo-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Order Delivery Date
                  {record.phases && record.phases.length > 0 && !deliveryDate && (
                    <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse">
                      Mandatory
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {record.phases && record.phases.length > 0 && !deliveryDate ? (
                    <span className="text-rose-700 font-bold">Please select the delivery date to save payment phases.</span>
                  ) : (
                    'Promised or target delivery date for this order.'
                  )}
                </p>
              </div>
              <div className="w-full sm:w-56 shrink-0">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl font-bold text-sm outline-none transition-all ${
                    !deliveryDate && record.phases && record.phases.length > 0
                      ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500 ring-2 ring-rose-200'
                      : 'border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Payment Phases Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Payment Phases</h3>
                <button 
                  onClick={addPhase}
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
                        {record.phases && record.phases.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removePhase(phase.id)} 
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                            title="Remove Phase"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                        )}
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
                            className={`w-full px-3 py-2 border rounded-lg outline-none font-bold ${
                              phase.status === 'Received'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
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
                        
                        {/* Transaction & Proof Details - Always Visible */}
                        <div className="md:col-span-2 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-indigo-600" />
                              Transaction Details & Proof
                            </h5>
                          </div>

                          <div className={`grid grid-cols-1 md:grid-cols-${phase.sourceType === 'Bank' ? '4' : '3'} gap-4`}>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Payment Source
                              </label>
                              <select 
                                value={phase.sourceType || ''}
                                onChange={(e) => updatePhase(phase.id, { sourceType: e.target.value as any })}
                                disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                className={`w-full px-3 py-2 border rounded-lg outline-none text-xs font-semibold ${
                                  phase.status === 'Received' && !unlockedPhases[phase.id] 
                                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'
                                }`}
                              >
                                <option value="">Select Source...</option>
                                <option value="Bank">Bank</option>
                                <option value="ICICI BANK">ICICI BANK</option>
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                              </select>
                            </div>

                            {phase.sourceType === 'Bank' && (
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Bank Name
                                </label>
                                <select 
                                  value={phase.bankName || ''}
                                  onChange={(e) => updatePhase(phase.id, { bankName: e.target.value as any })}
                                  disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                  className={`w-full px-3 py-2 border rounded-lg outline-none text-xs font-semibold ${
                                    phase.status === 'Received' && !unlockedPhases[phase.id] 
                                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                >
                                  <option value="">Select Bank...</option>
                                  <option value="PNB">PNB Bank</option>
                                  <option value="ICICI">ICICI Bank</option>
                                  <option value="SBI">SBI</option>
                                  <option value="Union">Union Bank</option>
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
                                placeholder="Enter UTR or Reference ID"
                                className={`w-full px-3 py-2 border rounded-lg outline-none text-xs ${phase.status === 'Received' && !unlockedPhases[phase.id] ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'}`} 
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Transaction Proof / Screenshot
                              </label>
                              {phase.screenshotUrl ? (
                                <div className="flex items-center gap-3 bg-emerald-50 p-2 border border-emerald-200 rounded-lg">
                                  <button type="button" onClick={() => setViewImage(phase.screenshotUrl || null)} className="block w-12 h-12 rounded border border-slate-300 overflow-hidden bg-slate-100 hover:opacity-80 transition-opacity shrink-0" title="Click to view full image">
                                    <img src={phase.screenshotUrl} alt="Proof" className="w-full h-full object-cover" />
                                  </button>
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Proof Attached
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => setViewImage(phase.screenshotUrl || null)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline">View</button>
                                      <button type="button" onClick={() => updatePhase(phase.id, { screenshotUrl: undefined })} disabled={phase.status === 'Received' && !unlockedPhases[phase.id]} className="text-xs font-bold text-rose-600 hover:text-rose-800 underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">Remove</button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => handleScreenshotUpload(phase.id, e)}
                                    disabled={phase.status === 'Received' && !unlockedPhases[phase.id]}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
                                  />
                                  <div className="w-full px-3 py-2 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 rounded-lg flex items-center justify-center text-xs font-semibold text-slate-700 transition-colors">
                                    <Upload className="w-4 h-4 mr-1.5 text-indigo-600" /> Upload Screenshot / Proof
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
