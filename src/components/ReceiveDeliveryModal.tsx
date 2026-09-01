import { motion, AnimatePresence } from 'motion/react';
import { X, XCircle, CheckCircle, Save, FileText, Package, User, Calendar, ClipboardCheck, Upload, Download } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Purchase, savePurchase } from '../lib/purchases';
import jsPDF from 'jspdf';
import { addSignatureToPDF } from '../lib/pdfHelper';
import autoTable from 'jspdf-autotable';

interface ReceiveDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export function ReceiveDeliveryModal({ isOpen, onClose, purchase }: ReceiveDeliveryModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    receivedBy: '',
    deliveryDateTime: '',
    quantityReceived: '',
    qualityStatus: 'Good' as 'Good' | 'Fair' | 'Poor',
    conditionStatus: 'Intact' as 'Intact' | 'Damaged',
    qcReport: '',
    remarks: '',
    damageImageBase64: ''
  });

  const isCompleted = purchase?.status === 'Delivered' || purchase?.status === 'Rejected';
  const isDelivered = purchase?.status === 'Delivered';

  useEffect(() => {
    if (purchase?.details?.deliveryQC) {
      setFormData(purchase.details.deliveryQC as any);
    } else {
      setFormData({
        receivedBy: '',
        deliveryDateTime: '',
        quantityReceived: '',
        qualityStatus: 'Good',
        conditionStatus: 'Intact',
        qcReport: '',
        remarks: '',
        damageImageBase64: ''
      });
    }
  }, [purchase]);


  useEffect(() => {
    if (!isCompleted && !isProcessing && (formData.receivedBy || formData.quantityReceived || formData.deliveryDateTime)) {
      const dateStr = formData.deliveryDateTime ? new Date(formData.deliveryDateTime).toLocaleString() : '[Date]';
      const summary = `Material received by ${formData.receivedBy || '[Name]'} on ${dateStr}. Quantity Received: ${formData.quantityReceived || '[Qty]'}. Quality: ${formData.qualityStatus}. Condition: ${formData.conditionStatus}.`;
      
      setFormData(prev => {
        if (prev.qcReport !== summary) {
          return { ...prev, qcReport: summary };
        }
        return prev;
      });
    }
  }, [formData.receivedBy, formData.deliveryDateTime, formData.quantityReceived, formData.qualityStatus, formData.conditionStatus, isCompleted]);

  if (!isOpen || !purchase) return null;


  
const generateSatisfactionLetter = async (status: 'Delivered' | 'Rejected' = 'Delivered') => {
    if (!purchase) return;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // 1. Page Border (thinner, more elegant)
    doc.setDrawColor(51, 65, 85); // Slate 700
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // 2. Header Section
    doc.setFontSize(26);
    doc.setTextColor(147, 75, 23); // Brown
    doc.setFont('helvetica', 'bold');
    doc.text('Srk Modular furniture co.', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', pageWidth / 2, 32, { align: 'center' });
    doc.text('Mobile: +91-7878590209 | Email: Sales@srkmodular.com | Website: https://srkmodular.com/', pageWidth / 2, 38, { align: 'center' });
    doc.text('GST: 08AAIPM7265R1ZR', pageWidth / 2, 44, { align: 'center' });
    
    doc.setDrawColor(147, 75, 23);
    doc.setLineWidth(0.8);
    doc.line(15, 50, pageWidth - 15, 50);
    
    // Document Title & Meta Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, 55, pageWidth - 30, 16, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(status === 'Rejected' ? 'GOODS RETURN NOTE (REJECTED)' : 'GOODS RECEIPT NOTE', 22, 65);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Doc No: ${status === 'Rejected' ? 'REJ' : 'GRN'}-${purchase.id.substring(0,6).toUpperCase()}`, pageWidth - 90, 65);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 40, 65);
    
    // Watermark
    doc.setFontSize(70);
    doc.setTextColor(241, 245, 249);
    doc.setFont('helvetica', 'bold');
    doc.text(status === 'Rejected' ? 'REJECTED' : (formData.conditionStatus === 'Damaged' ? 'DAMAGED' : 'APPROVED'), pageWidth/2, pageHeight/2 + 20, { 
      align: 'center', 
      angle: 45 
    });
    
    doc.setTextColor(15, 23, 42);
    
    // 3. Delivery Information Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CONSIGNMENT DETAILS', 15, 85);
    
    autoTable(doc, {
      startY: 90,
      body: [
        ['Purchase Order Ref', `PO-${purchase.id.substring(0,6).toUpperCase()}`],
        ['Vendor Details', purchase.vendorName],
        ['Item Description', purchase.productName],
        ['Receiving Officer', formData.receivedBy || 'N/A'],
        ['Timestamp of Receipt', formData.deliveryDateTime ? new Date(formData.deliveryDateTime).toLocaleString() : 'N/A'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, lineColor: [203, 213, 225] },
      columnStyles: { 
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 55, textColor: [71, 85, 105] },
        1: { textColor: [15, 23, 42] }
      },
      margin: { left: 15, right: 15 }
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // 4. Inspection & QC Summary
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. QUALITY ASSURANCE INSPECTION', 15, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      body: [
        ['Ordered Quantity', purchase.details?.quantity || 'N/A'],
        ['Delivered Quantity', formData.quantityReceived || 'N/A'],
        ['Quality Grade', formData.qualityStatus.toUpperCase()],
        ['Physical Condition', formData.conditionStatus.toUpperCase()],
        ['Final Action', status === 'Rejected' ? 'REJECTED - SENT FOR PURCHASE RETURN' : 'ACCEPTED'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, lineColor: [203, 213, 225] },
      columnStyles: { 
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 55, textColor: [71, 85, 105] },
        1: { textColor: [15, 23, 42], fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // 5. Remarks & Notes
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. INSPECTION REMARKS', 15, currentY);
    
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitQC = doc.splitTextToSize(formData.qcReport || 'Material verified according to standard operating procedures. No deviations reported.', pageWidth - 40);
    
    const remarksText = formData.remarks ? `Additional Notes: ${formData.remarks}` : '';
    const splitRemarks = doc.splitTextToSize(remarksText, pageWidth - 40);
    
    const boxHeight = (splitQC.length * 5) + (remarksText ? splitRemarks.length * 5 + 5 : 0) + 12;
    
    doc.rect(15, currentY + 5, pageWidth - 30, boxHeight, 'FD');
    doc.setTextColor(71, 85, 105);
    doc.text(splitQC, 20, currentY + 13);
    if (remarksText) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(15, 23, 42);
      doc.text(splitRemarks, 20, currentY + 13 + (splitQC.length * 5) + 3);
    }
    
    currentY = currentY + boxHeight + 20;
    
    // 6. Photographic Evidence
    if (formData.conditionStatus === 'Damaged' && formData.damageImageBase64) {
      if (currentY + 120 > pageHeight - 40) {
        doc.addPage();
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
        currentY = 25;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // Red 600
      doc.text('4. NON-CONFORMANCE EVIDENCE (ATTACHED)', 15, currentY);
      
      try {
        const type = formData.damageImageBase64.includes('jpeg') || formData.damageImageBase64.includes('jpg') ? 'JPEG' : 'PNG';
        
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.5);
        doc.rect(15, currentY + 5, 120, 90);
        
        doc.addImage(formData.damageImageBase64, type, 15, currentY + 5, 120, 90, undefined, 'FAST');
        currentY += 105;
      } catch (e) {
        console.error('Failed to add image to PDF', e);
        doc.setFont('helvetica', 'italic');
        doc.text('(Image evidence corrupted or unavailable)', 15, currentY + 15);
        currentY += 25;
      }
    }
    
    // 7. Official Declaration
    if (currentY + 60 > pageHeight - 20) {
      doc.addPage();
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      currentY = 25;
    }
    
    doc.setFillColor(241, 245, 249);
    doc.rect(15, currentY, pageWidth - 30, 20, 'F');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'italic');
    const declaration = status === 'Rejected' 
      ? "DECLARATION: This document certifies that the aforementioned goods have been inspected and REJECTED. The items do not meet the required quality standards and are hereby being sent for purchase return." 
      : "DECLARATION: This document certifies that the aforementioned goods have been inspected by authorized personnel. The condition and quantities stated reflect the actual state of goods at the time of delivery. Any discrepancies must be reported to the procurement department within 24 hours of this document's issuance.";
    doc.text(doc.splitTextToSize(declaration, pageWidth - 40), 20, currentY + 6);
    
    currentY += 40;
    
    // 8. Signatures
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Left Sig
    doc.text('Authorized QA Inspector', 20, currentY);
    doc.setDrawColor(148, 163, 184);
    doc.line(20, currentY + 15, 80, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${formData.receivedBy || 'Quality Assurance Dept.'}`, 20, currentY + 20);
    doc.text('SRK Modular Operations', 20, currentY + 25);
    
    // Right Sig
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Vendor Acknowledgment', pageWidth - 80, currentY);
    doc.line(pageWidth - 80, currentY + 15, pageWidth - 20, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Signature / Company Seal', pageWidth - 80, currentY + 20);
    doc.text('Date: ___/___/20__', pageWidth - 80, currentY + 25);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
      doc.text('CONFIDENTIAL - For Internal Use Only', 15, pageHeight - 15);
    }
    
    await addSignatureToPDF(doc, pageWidth - 70, currentY + 2);
    doc.save(`GRN_SRK_${purchase.id.substring(0,6).toUpperCase()}.pdf`);
  };


    const handleAction = async (status: 'Delivered' | 'Rejected') => {
    if (purchase?.status === status) {
      onClose();
      return;
    }
    setIsProcessing(true);
    try {
      await savePurchase({
        id: purchase.id,
        docId: purchase.docId,
        status: status,
        details: {
          ...purchase.details,
          deliveryQC: formData
        }
      });
      generateSatisfactionLetter(status);
      onClose();
    } catch (error) {
      console.error('Error processing delivery:', error);
      alert('Failed to save delivery details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction('Delivered');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${purchase?.status === 'Rejected' ? 'bg-rose-100 text-rose-600' : isDelivered ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {purchase?.status === 'Rejected' ? <XCircle className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {purchase?.status === 'Rejected' ? 'Goods Return Note (Rejected)' : isDelivered ? 'Delivery & QC Report' : 'Receive Delivery & QC'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">PO: {purchase.id.substring(0, 8)} - {purchase.productName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
            <form id="receiveDeliveryForm" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Delivery Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Received By</label>
                    <input
                      type="text"
                      required
                      disabled={isCompleted}
                      value={formData.receivedBy}
                      onChange={e => setFormData({ ...formData, receivedBy: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium disabled:bg-slate-50 disabled:text-slate-600"
                      placeholder="Person taking delivery"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      disabled={isCompleted}
                      value={formData.deliveryDateTime}
                      onChange={e => setFormData({ ...formData, deliveryDateTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium disabled:bg-slate-50 disabled:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-500" /> Material Inspection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Quantity Received</label>
                    <input
                      type="text"
                      required
                      disabled={isCompleted}
                      value={formData.quantityReceived}
                      onChange={e => setFormData({ ...formData, quantityReceived: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium disabled:bg-slate-50 disabled:text-slate-600"
                      placeholder={`Expected: ${purchase.details?.quantity || 'N/A'}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Quality Assessment</label>
                    <select
                      value={formData.qualityStatus}
                      disabled={isCompleted}
                      onChange={e => setFormData({ ...formData, qualityStatus: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium disabled:bg-slate-50 disabled:text-slate-600"
                    >
                      <option value="Good">Good (Matches Spec)</option>
                      <option value="Fair">Fair (Minor Deviations)</option>
                      <option value="Poor">Poor (Rejected/Return)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Physical Condition</label>
                    <div className="flex gap-3 h-10 items-center">
                      <label className={`flex items-center gap-2 text-sm font-medium ${isCompleted ? 'text-slate-500' : 'text-slate-700 cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="condition"
                          value="Intact"
                          disabled={isCompleted}
                          checked={formData.conditionStatus === 'Intact'}
                          onChange={e => setFormData({ ...formData, conditionStatus: 'Intact' })}
                          className="text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        Intact
                      </label>
                      <label className={`flex items-center gap-2 text-sm font-medium ${isCompleted ? 'text-slate-500' : 'text-slate-700 cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="condition"
                          value="Damaged"
                          disabled={isCompleted}
                          checked={formData.conditionStatus === 'Damaged'}
                          onChange={e => setFormData({ ...formData, conditionStatus: 'Damaged' })}
                          className="text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        Damaged
                      </label>
                    </div>
                  </div>
                </div>
              </div>


              {formData.conditionStatus === 'Damaged' && (
                <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-4">
                  <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-rose-500" /> Damage Proof Image
                  </h3>
                  <div className="space-y-3">
                    {!isCompleted && (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, damageImageBase64: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 transition-colors"
                      />
                    )}
                    {formData.damageImageBase64 && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                        <img src={formData.damageImageBase64} alt="Damage Proof" className="max-h-64 object-contain w-full bg-slate-100" />
                      </div>
                    )}
                    {isCompleted && !formData.damageImageBase64 && (
                      <p className="text-sm text-slate-500">No damage image uploaded.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> QC & Remarks
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">QC Report Summary</label>
                    <textarea
                      rows={2}
                      disabled={isCompleted}
                      value={formData.qcReport}
                      onChange={e => setFormData({ ...formData, qcReport: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm custom-scrollbar resize-none font-medium disabled:bg-slate-50 disabled:text-slate-600"
                      placeholder="Brief QC findings or check notes..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">Additional Remarks</label>
                    <textarea
                      rows={2}
                      disabled={isCompleted}
                      value={formData.remarks}
                      onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm custom-scrollbar resize-none font-medium disabled:bg-slate-50 disabled:text-slate-600"
                      placeholder="Any other notes..."
                    />
                  </div>
                </div>
              </div>

            </form>
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
            {isCompleted ? (
              <div className="flex gap-3">
                {purchase?.status === 'Delivered' && (
                  <button
                    type="button"
                    onClick={() => handleAction('Rejected')}
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Process Return
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => generateSatisfactionLetter(purchase?.status as any)}
                  className="px-6 py-2.5 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Letter
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 text-white font-semibold hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('Rejected')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reject & Return
                    </>
                  )}
                </button>
                <button
                  type="submit"
                  form="receiveDeliveryForm"
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Accept Delivery
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
