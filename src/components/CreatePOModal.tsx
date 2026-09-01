import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download } from 'lucide-react';
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { addSignatureToPDF } from '../lib/pdfHelper';
import autoTable from 'jspdf-autotable';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  vendors?: any[];
  onCreatePO?: (poData: any) => void;
}

export function CreatePOModal({ isOpen, onClose, products, vendors = [], onCreatePO }: CreatePOModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '1',
    eta: '',
    advancePayment: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const generatePDF = async (product: any, quantity: number, poNumber: string) => {
    const doc = new jsPDF();
    
    // Fetch product image data
    let productImageData = product.details?.productImageData;
    if (!productImageData && product.docId) {
      try {
        const { getProductFile } = await import('../lib/fileStorage');
        productImageData = await getProductFile(product.docId);
      } catch (err) {
        console.error("Failed to load product image", err);
      }
    }
    
    // Helper for colors
    const brownColor = '#8B4513';
    const setBrownText = () => doc.setTextColor(139, 69, 19);
    const setBlackText = () => doc.setTextColor(0, 0, 0);
    const setGrayText = () => doc.setTextColor(80, 80, 80);

    // Header
    doc.setFont("helvetica", "bold");
    setBrownText();
    doc.setFontSize(22);
    doc.text('Srk Modular furniture co.', 105, 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setGrayText();
    doc.text('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', 105, 27, { align: 'center' });
    doc.text('Mobile: +91-7878590209 | Email: Sales@srkmodular.com | Website: https://srkmodular.com/', 105, 32, { align: 'center' });
    doc.text('GST: 08AAIPM7265R1ZR', 105, 37, { align: 'center' });

    // Brown line
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setBlackText();
    doc.text('PURCHASE ORDER', 105, 52, { align: 'center' });

    // Find vendor
    const vendor = vendors.find(v => v.id === product.vendorId) || null;

    // Vendor and PO info
    doc.setFontSize(10);
    
    // Left side (To)
    doc.setFont("helvetica", "normal");
    doc.text('To,', 14, 65);
    doc.setFont("helvetica", "bold");
    doc.text(product.vendorName || 'Vendor', 14, 71);
    
    doc.setFont("helvetica", "normal");
    if (vendor) {
      if (vendor.email) doc.text(`Email: ${vendor.email}`, 14, 77);
      if (vendor.phone) doc.text(`Mobile: ${vendor.phone}`, 14, 83);
      if (vendor.address) {
        const addressLines = doc.splitTextToSize(`Address: ${vendor.address}`, 80);
        doc.text(addressLines, 14, 89);
      }
    }
    
    // Right side (PO Info)
    doc.setFont("helvetica", "bold");
    doc.text(`PO No: ${poNumber}`, 196, 65, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 71, { align: 'right' });
    if (formData.eta) {
      doc.text(`ETA: ${new Date(formData.eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 77, { align: 'right' });
    }
    if (formData.advancePayment) {
      doc.text(`Advance: ${formData.advancePayment}`, 196, formData.eta ? 83 : 77, { align: 'right' });
    }

    // Greeting
    // Determine Y coordinate based on vendor address length
    let greetingY = 105;
    if (vendor && vendor.address) {
       const addressLines = doc.splitTextToSize(`Address: ${vendor.address}`, 80);
       greetingY = 89 + (addressLines.length * 5) + 5;
    }
    
    doc.text('Dear Sir/Ma\'am,', 14, greetingY);
    doc.text('Please find our purchase order details below:', 14, greetingY + 6);

    // Table
    const perUnitPrice = product.details?.perUnitPrice || product.price || '0';
    // try to extract number
    const numericPriceMatch = perUnitPrice.match(/\d[\d,.]*/);
    const numericPrice = numericPriceMatch ? parseFloat(numericPriceMatch[0].replace(/,/g, '')) : 0;
    const amount = numericPrice * quantity;

    autoTable(doc, {
      startY: greetingY + 12,
      head: [['Sl.', 'Image', 'Product Details', 'Metric', 'Unit Price', 'Qty', 'Amount (INR)']],
      body: [
        [
          '1',
          '', // Image placeholder
          `\n${product.name}\n${product.details?.details || product.description ? (product.details?.details || product.description) + '\n' : ''}${product.specification ? `Size/Spec: ${product.specification}` : ''}`.trim(),
          product.details?.measuringMetric || '-',
          perUnitPrice,
          quantity.toString(),
          `Rs. ${amount.toLocaleString()}`
        ],
      ],
      headStyles: {
        fillColor: [139, 69, 19], // Brown header
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      bodyStyles: {
        minCellHeight: 22,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22, halign: 'center' }, // Image
        2: { cellWidth: 50 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 32, halign: 'right' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1 && productImageData) {
          const imgData = productImageData;
          const imgSize = 18;
          // Calculate centering
          const x = data.cell.x + (data.cell.width - imgSize) / 2;
          const y = data.cell.y + (data.cell.height - imgSize) / 2;
          
          if (imgData.startsWith('data:image')) {
             try {
                let format = 'JPEG';
                if (imgData.includes('image/png')) format = 'PNG';
                else if (imgData.includes('image/webp')) format = 'WEBP';
                
                doc.addImage(imgData, format, x, y, imgSize, imgSize);
             } catch (e) {
                console.error('Error adding image to PDF', e);
             }
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Box (Right Side)
    const gstAmount = amount * 0.18; // Assuming 18% GST for example
    const grandTotal = amount + gstAmount;

    doc.setFillColor(245, 245, 245);
    doc.rect(130, finalY, 66, 35, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setBlackText();
    doc.text('Subtotal:', 135, finalY + 10);
    doc.text(`Rs. ${amount.toLocaleString()}`, 191, finalY + 10, { align: 'right' });
    
    doc.text('GST (18%):', 135, finalY + 20);
    doc.text(`Rs. ${gstAmount.toLocaleString()}`, 191, finalY + 20, { align: 'right' });
    
    doc.setFont("helvetica", "bold");
    doc.text('Grand Total:', 135, finalY + 30);
    doc.text(`Rs. ${grandTotal.toLocaleString()}`, 191, finalY + 30, { align: 'right' });

    let tY = finalY + 55;

    // Footer line
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.line(14, tY, 196, tY);
    
    // Footer text
    tY += 8;
    doc.setFontSize(9);
    setGrayText();
    doc.text('Thank you for your business!', 105, tY, { align: 'center' });
    doc.text('For any queries, please contact us at +91-7878590209', 105, tY + 5, { align: 'center' });
    
    await addSignatureToPDF(doc, 145, tY - 25);
    doc.save(`PO-${poNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct) throw new Error("Product not found");
      
      const poNumber = `PO-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      // Generate and download PDF
      await generatePDF(selectedProduct, parseInt(formData.quantity) || 1, poNumber);
      
      if (onCreatePO) {
        await onCreatePO({
          poNumber,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          vendorName: selectedProduct.vendorName,
          price: selectedProduct.price,
          quantity: formData.quantity,
          eta: formData.eta,
          advancePayment: formData.advancePayment,
          productImageData: selectedProduct.details?.productImageData
        });
      }
    } catch (error) {
      console.error("Error creating PO", error);
    } finally {
      setIsProcessing(false);
      setFormData({ productId: '', quantity: '1', eta: '',
    advancePayment: '' });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-full"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Create Purchase Order</h3>
                  <p className="text-xs font-medium text-slate-500">Generate PO and download PDF</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="create-po-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Product</label>
                  <select 
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
                    required
                  >
                    <option value="" disabled>Select a product</option>
                    {products.map((p, i) => (
                      <option key={`${p.docId || p.id || 'k'}-${i}`} value={p.id}>{p.name} - {p.vendorName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quantity</label>
                    <input 
                      type="number" 
                      name="quantity"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                                    <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">ETA (Optional)</label>
                    <input 
                      type="date" 
                      name="eta"
                      value={formData.eta}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Advance Payment (Optional)</label>
                    <input 
                      type="text" 
                      name="advancePayment"
                      value={formData.advancePayment}
                      onChange={handleChange}
                      placeholder="e.g. 50% or ₹10,000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="create-po-form"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isProcessing}
              >
                <Download className="w-4 h-4" />
                {isProcessing ? 'Generating...' : 'Create & Download PDF'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
