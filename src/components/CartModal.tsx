import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, ShoppingCart, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../lib/products';
import { Vendor } from '../lib/vendors';
import { getProductFile } from '../lib/fileStorage';
import { addSignatureToPDF } from '../lib/pdfHelper';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: {product: Product, quantity: number}[];
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  vendors: Vendor[];
  onCreatePO: (poData: any) => Promise<void>;
  clearCart: () => void;
}

export function CartModal({ isOpen, onClose, cart, updateQuantity, removeFromCart, vendors, onCreatePO, clearCart }: CartModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const generatePDFsAndCreatePOs = async () => {
    setIsProcessing(true);
    try {
      // Group by vendorId
      const grouped = cart.reduce((acc, item) => {
        const vid = item.product.vendorId || 'Unknown Vendor';
        if (!acc[vid]) acc[vid] = [];
        acc[vid].push(item);
        return acc;
      }, {} as Record<string, {product: Product, quantity: number}[]>);

      for (const vendorId of Object.keys(grouped)) {
        const items = grouped[vendorId];
        const vendor = vendors.find(v => v.id === vendorId) || null;
        const vendorName = vendor ? vendor.name : (items[0].product.vendorName || 'Vendor');
        const poNumber = `PO-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        const doc = new jsPDF();

        // Helper for colors
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

        // Left side (To)
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text('To,', 14, 65);
        doc.setFont("helvetica", "bold");
        doc.text(vendorName, 14, 71);
        
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

        let greetingY = 105;
        if (vendor && vendor.address) {
           const addressLines = doc.splitTextToSize(`Address: ${vendor.address}`, 80);
           greetingY = 89 + (addressLines.length * 5) + 5;
        }
        
        doc.text('Dear Sir/Ma\'am,', 14, greetingY);
        doc.text('Please find our purchase order details below:', 14, greetingY + 6);

        // Fetch all images for this PO
        const images: Record<string, string> = {};
        for (const item of items) {
          if (item.product.details?.productImageData) {
            images[item.product.id!] = item.product.details.productImageData;
          } else if (item.product.docId) {
             try {
                const img = await getProductFile(item.product.docId);
                if (img) images[item.product.id!] = img;
             } catch (e) {
                console.error("Could not fetch image", e);
             }
          }
        }

        const tableBody: any[][] = [];
        let totalAmount = 0;

        items.forEach((item, index) => {
          const perUnitPriceStr = item.product.details?.perUnitPrice || item.product.price || '0';
          const numericPriceMatch = perUnitPriceStr.match(/\d[\d,.]*/);
          const numericPrice = numericPriceMatch ? parseFloat(numericPriceMatch[0].replace(/,/g, '')) : 0;
          const amount = numericPrice * item.quantity;
          totalAmount += amount;

          tableBody.push([
            (index + 1).toString(),
            '', // Empty string for image cell, ID fetched via index in didDrawCell
            `\n${item.product.name}\n${item.product.details?.details || (item.product as any).description ? (item.product.details?.details || (item.product as any).description) + '\n' : ''}${item.product.specification ? `Size/Spec: ${item.product.specification}` : ''}`.trim(),
            item.product.details?.measuringMetric || '-',
            numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            item.quantity.toString(),
            `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ]);
        });

        autoTable(doc, {
          startY: greetingY + 12,
          head: [['Sl.', 'Image', 'Product Details', 'Metric', 'Unit Price', 'Qty', 'Amount (INR)']],
          body: tableBody,
          headStyles: {
            fillColor: [139, 69, 19],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: { fontSize: 9, cellPadding: 4 },
          bodyStyles: { minCellHeight: 22 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 50 },
            3: { cellWidth: 20 },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 15, halign: 'center' },
            6: { cellWidth: 32, halign: 'right' }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
              const prodId = items[data.row.index]?.product?.id;
              data.cell.text = []; // Clear the ID text
              
              const imgData = images[prodId];
              if (imgData && imgData.startsWith('data:image')) {
                const imgSize = 18;
                const x = data.cell.x + (data.cell.width - imgSize) / 2;
                const y = data.cell.y + (data.cell.height - imgSize) / 2;
                
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
        const gstAmount = totalAmount * 0.18;
        const grandTotal = totalAmount + gstAmount;

        doc.setFillColor(245, 245, 245);
        doc.rect(130, finalY, 66, 35, 'F');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        setBlackText();
        doc.text('Subtotal:', 135, finalY + 10);
        doc.text(`${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 10, { align: 'right' });
        
        doc.text('GST (18%):', 135, finalY + 20);
        doc.text(`${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 20, { align: 'right' });
        
        doc.setFont("helvetica", "bold");
        doc.text('Grand Total:', 135, finalY + 30);
        doc.text(`${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 30, { align: 'right' });

        let tY = finalY + 55;
        doc.setDrawColor(139, 69, 19);
        doc.setLineWidth(0.5);
        doc.line(14, tY, 196, tY);
        
        tY += 8;
        doc.setFontSize(9);
        setGrayText();
        doc.text('Thank you for your business!', 105, tY, { align: 'center' });
        doc.text('For any queries, please contact us at +91-7878590209', 105, tY + 5, { align: 'center' });
        
        await addSignatureToPDF(doc, 145, tY - 25);
        doc.save(`PO-${poNumber}.pdf`);

        // Create PO records for each item
        for (const item of items) {
          await onCreatePO({
            poNumber,
            productId: item.product.id,
            productName: item.product.name,
            vendorName: vendorName,
            price: item.product.price,
            quantity: item.quantity.toString(),
            eta: '',
            productImageData: item.product.details?.productImageData
          });
        }
      }

      clearCart();
      onClose();
    } catch (error) {
      console.error("Error creating PO from cart", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Cart & Checkout</h3>
                  <p className="text-xs font-medium text-slate-500">{totalItems} items selected</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, i) => (
                    <div key={`${item.product.docId || item.product.id || 'k'}-${i}`} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-white">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-indigo-600 mb-0.5">{item.product.vendorName}</div>
                        <h4 className="font-bold text-slate-800 leading-tight">{item.product.name}</h4>
                        <div className="text-xs text-slate-500 mt-1">Unit Price: {item.product.details?.perUnitPrice || item.product.price || '-'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Qty</span>
                          <input 
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id!, parseInt(e.target.value) || 1)}
                            className="w-12 bg-transparent font-bold text-center focus:outline-none text-sm"
                          />
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.product.id!)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                  disabled={isProcessing}
                >
                  Keep Browsing
                </button>
                <button 
                  onClick={generatePDFsAndCreatePOs}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                  disabled={isProcessing}
                >
                  <FileText className="w-4 h-4" />
                  {isProcessing ? 'Generating POs...' : 'Checkout & Generate POs'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
