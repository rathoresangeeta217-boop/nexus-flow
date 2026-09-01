import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, Edit, MessageCircle, Download, Trash } from 'lucide-react';
import { deletePurchase } from '../lib/purchases';
import { deleteVendorPaymentRecord } from '../lib/vendorPayments';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VendorPaymentModal, AggregatedPO } from './VendorPaymentModal';
import { getAllVendorPayments, VendorPaymentRecord } from '../lib/vendorPayments';
import { getAllVendors, Vendor } from '../lib/vendors';
import { Badge } from './Badge';

interface ProjectVendorSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectVendor: any | null; // Has projectVendorId, projectName, vendorName, totalAmount, pos array
}

export function ProjectVendorSummaryModal({ isOpen, onClose, projectVendor }: ProjectVendorSummaryModalProps) {
  const [payments, setPayments] = useState<VendorPaymentRecord[]>([]);
  const [selectedPO, setSelectedPO] = useState<AggregatedPO | null>(null);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [poToDelete, setPoToDelete] = useState<any | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && projectVendor) {
      fetchPayments();
    }
  }, [isOpen, projectVendor]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const allPayments = await getAllVendorPayments();
      const poNumbers = projectVendor.pos.map((p: any) => p.poNumber);
      setPayments(allPayments.filter(p => poNumbers.includes(p.poNumber)));
      
      const allVendors = await getAllVendors();
      const match = allVendors.find(v => v.name === projectVendor.vendorName);
      if (match) setVendorDetails(match);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const confirmDeletePO = async () => {
    if (deletePassword !== '9785') {
      const msg = document.createElement('div');
      msg.textContent = 'Incorrect password.';
      msg.style.position = 'fixed';
      msg.style.top = '20px';
      msg.style.right = '20px';
      msg.style.backgroundColor = '#ef4444';
      msg.style.color = 'white';
      msg.style.padding = '12px 24px';
      msg.style.borderRadius = '8px';
      msg.style.zIndex = '999999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
      return;
    }

    if (!poToDelete) return;
    setIsDeleting(true);

    try {
      const q = query(collection(db, 'purchases'), where('details.poNumber', '==', poToDelete.poNumber));
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        await deletePurchase(docSnap.id);
      }
      
      const record = payments.find(p => p.poNumber === poToDelete.poNumber);
      if (record && record.docId) {
        await deleteVendorPaymentRecord(record.docId);
      }
      
      const msg = document.createElement('div');
      msg.textContent = 'Successfully deleted Purchase Order records.';
      msg.style.position = 'fixed';
      msg.style.top = '20px';
      msg.style.right = '20px';
      msg.style.backgroundColor = '#10b981';
      msg.style.color = 'white';
      msg.style.padding = '12px 24px';
      msg.style.borderRadius = '8px';
      msg.style.zIndex = '999999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);

      setPoToDelete(null);
      setDeletePassword('');
      fetchPayments();
    } catch (err) {
      console.error('Failed to delete', err);
      const msg = document.createElement('div');
      msg.textContent = 'Failed to delete records.';
      msg.style.position = 'fixed';
      msg.style.top = '20px';
      msg.style.right = '20px';
      msg.style.backgroundColor = '#ef4444';
      msg.style.color = 'white';
      msg.style.padding = '12px 24px';
      msg.style.borderRadius = '8px';
      msg.style.zIndex = '999999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  let totalPaid = 0;
  payments.forEach(payment => {
    payment.phases?.forEach(phase => {
      if (phase.status === 'Paid') {
        totalPaid += parseFloat(String(phase.amount || '0').replace(/,/g, '')) || 0;
      }
    });
  });

  const pendingAmount = Math.max(0, projectVendor.totalAmount - totalPaid);

  const handleWhatsAppRequest = async (e: React.MouseEvent, poNumber: string, amount: string) => {
    e.preventDefault();

    const proceedWithWhatsApp = (wasCopied: boolean) => {
      const amountStr = String(amount || '0').replace(/,/g, '');
      const text = buildWhatsAppText(poNumber, parseFloat(amountStr || '0'));
      const url = `https://web.whatsapp.com/send/?phone=919314871718&text=${text}`;
      
      if (wasCopied) {
         alert('✅ QR Code COPIED to clipboard!\n\n⚠️ IMPORTANT: WhatsApp does NOT allow websites to auto-attach images.\n\n👉 When WhatsApp opens, you MUST press PASTE (Ctrl+V or Right-Click -> Paste) in the chat box to attach the QR code.');
      } else if (vendorDetails?.qrCodeData) {
         alert('⚠️ Could not copy the QR code to clipboard automatically. You may need to download it manually.');
      }
      
      window.open(url, 'whatsapp_web_tab');
    };

    if (vendorDetails?.qrCodeData) {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = vendorDetails.qrCodeData;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
              if (blob && navigator.clipboard && window.ClipboardItem) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                  ]);
                  proceedWithWhatsApp(true);
                } catch (err) {
                  console.error('Clipboard copy failed:', err);
                  proceedWithWhatsApp(false);
                }
              } else {
                proceedWithWhatsApp(false);
              }
            }, 'image/png');
          } else {
            proceedWithWhatsApp(false);
          }
        };
        img.onerror = () => proceedWithWhatsApp(false);
      } catch (err) {
        console.error("Image processing failed", err);
        proceedWithWhatsApp(false);
      }
    } else {
      proceedWithWhatsApp(false);
    }
  };

  const buildWhatsAppText = (poNumber: string, amount: number) => {
    let text = `Hello, please process the advance payment for PO: ${poNumber}\nProject: ${projectVendor.projectName}\nVendor: ${projectVendor.vendorName}\nAmount: ₹${amount}`;
    
    if (vendorDetails) {
      if (vendorDetails.bankName || vendorDetails.accountNumber) {
        text += `\n\nBank Details:`;
        if (vendorDetails.bankName) text += `\nBank: ${vendorDetails.bankName}`;
        if (vendorDetails.accountName) text += `\nAccount Name: ${vendorDetails.accountName}`;
        if (vendorDetails.accountNumber) text += `\nAccount No: ${vendorDetails.accountNumber}`;
        if (vendorDetails.ifscCode) text += `\nIFSC: ${vendorDetails.ifscCode}`;
      }
      if (vendorDetails.qrCodeData || vendorDetails.qrCodeName) {
        text += `\n\nNote: Vendor has provided QR Code/UPI details for payment in the system.`;
      }
    }
    return encodeURIComponent(text);
  };

  return (
    <AnimatePresence>
      {isOpen && projectVendor && (
      <div key="summary-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Payment Summary - {projectVendor.vendorName}</h2>
              <p className="text-sm text-slate-500">Project: {projectVendor.projectName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-blue-900">₹{projectVendor.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Paid Amount</p>
                <p className="text-3xl font-bold text-emerald-900">₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 shadow-sm">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Pending Amount</p>
                <p className="text-3xl font-bold text-rose-900">₹{pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-400" />
              Purchase Orders in this Project
            </h3>

            {/* PO List */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">PO Number</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">PO Total</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Paid</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-center">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectVendor.pos.map((po: any, i: number) => {
                    const record = payments.find(p => p.poNumber === po.poNumber);
                    let poPaid = 0;
                    record?.phases?.forEach(phase => {
                      if (phase.status === 'Paid') poPaid += parseFloat(String(phase.amount || '0').replace(/,/g, '')) || 0;
                    });
                    
                    const isFullyPaid = poPaid >= po.totalAmount && po.totalAmount > 0;
                    const isPartiallyPaid = poPaid > 0 && poPaid < po.totalAmount;

                    return (
                      <tr key={`${po.poNumber || "po"}-${i}`} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{po.poNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 text-right">₹{po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600 text-right">₹{poPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isFullyPaid ? (
                            <Badge variant="success">Fully Paid</Badge>
                          ) : isPartiallyPaid ? (
                            <Badge variant="warning">Partial</Badge>
                          ) : (
                            <Badge variant="default">Pending</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                          {record?.phases?.some(p => p.title.toLowerCase().includes('advance') && p.status === 'Request Payment') && (
                            <>
                              <button
                                onClick={(e) => handleWhatsAppRequest(e, po.poNumber, record.phases.find(p => p.title.toLowerCase().includes('advance') && p.status === 'Request Payment')?.amount || '0')}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Request
                              </button>
                              {vendorDetails?.qrCodeData && (
                                <a
                                  href={vendorDetails.qrCodeData}
                                  download={`QR_${vendorDetails.name}.jpg`}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                  title="Download QR Code"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedPO({
                                poNumber: po.poNumber,
                                vendorName: po.vendorName,
                                totalAmount: po.totalAmount
                              });
                              setIsPOModalOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" /> Manage Payment
                          </button>
                          <button 
                            onClick={() => setPoToDelete(po)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors ml-2"
                          >
                            <Trash className="w-3.5 h-3.5 mr-1.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
      )}
      
      {poToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Confirm Deletion</h3>
              <button onClick={() => { setPoToDelete(null); setDeletePassword(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to delete all purchases and payment records for PO: <strong>{poToDelete.poNumber}</strong>? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Enter Password to Confirm (9785)</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setPoToDelete(null); setDeletePassword(''); }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePO}
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete PO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPOModalOpen && selectedPO && (
        <VendorPaymentModal
          isOpen={isPOModalOpen}
          onClose={() => {
            setIsPOModalOpen(false);
            fetchPayments(); // refresh on close
          }}
          po={selectedPO}
        />
      )}
    </AnimatePresence>
  );
}
