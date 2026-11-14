import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProductFile, getVariantFile } from './fileStorage';
import { calculatePhaseGstAdjustment, getPaymentForOrder } from './payments';


const addPageBorder = (doc: any) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);
    doc.setLineWidth(0.2);
    doc.rect(6.5, 6.5, 197, 284);
  }
};

export const addSignatureToPDF = async (doc: any, x: number, y: number) => {
  try {
    const response = await fetch('/signature.png');
    if (response.ok) {
      const blob = await response.blob();
      const base64data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64data, 'PNG', x, y, 50, 20);
    } else {
      // Fallback text
      doc.setTextColor(147, 51, 234); // Purple-600
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(10);
      doc.text('For SRK Modular Furniture Co', x + 25, y + 5, { align: 'center' });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text('Authorised Signatory', x + 25, y + 18, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  } catch (error) {
    console.error('Error adding signature:', error);
  }
};


export const generatePOPDF = async (
  poNumber: string,
  vendorName: string,
  vendor: any,
  items: any[] // array of { product: any, quantity: number }
) => {
  const doc = new jsPDF();
  const setBlackText = () => doc.setTextColor(0, 0, 0);
  const setGrayText = () => doc.setTextColor(100, 100, 100);

  // Fetch all images for this PO
  const images: Record<string, string> = {};
  for (const item of items) {
    if (item.product.details?.productImageData) {
      images[item.product.id!] = item.product.details.productImageData;
    } else if (item.product.docId || item.product.id) {
      try {
        const idToFetch = item.product.docId || item.product.id;
        const imgData = await getProductFile(idToFetch);
        if (imgData) images[item.product.id!] = imgData;
      } catch (e) {
        console.error("Could not fetch image", e);
      }
    }
  }

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 40, 'F');

  // Company Info
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Srk Modular furniture co.', 105, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setGrayText();
  doc.text('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', 105, 24, { align: 'center' });
  doc.text('Mobile: +91-7878590209 | Email: Sales@srkmodular.com | Website: https://srkmodular.com/', 105, 29, { align: 'center' });
  doc.text('GSTIN: 08AAIPM7265R1ZR', 105, 34, { align: 'center' });

  // Border Line
  doc.setDrawColor(139, 69, 19);
  doc.setLineWidth(1);
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

  // Buyer Info (Right Side)
  doc.setFont("helvetica", "bold");
  doc.text('Bill / Ship To:', 196, 83, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text('Srk Modular furniture co.', 196, 89, { align: 'right' });
  const buyerAddress = doc.splitTextToSize('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', 80);
  doc.text(buyerAddress, 196, 95, { align: 'right' });
  const buyerEmailY = 95 + (buyerAddress.length * 5);
  doc.text('Mobile: +91-7878590209', 196, buyerEmailY, { align: 'right' });
  doc.text('GST: 08AAIPM7265R1ZR', 196, buyerEmailY + 5, { align: 'right' });

  let greetingY = 105;
  if (vendor && vendor.address) {
     const addressLines = doc.splitTextToSize(`Address: ${vendor.address}`, 80);
     const vendorBottomY = 89 + (addressLines.length * 5) + 5;
     const buyerBottomY = buyerEmailY + 15;
     greetingY = Math.max(vendorBottomY, buyerBottomY);
  } else {
     const buyerBottomY = buyerEmailY + 15;
     greetingY = Math.max(105, buyerBottomY);
  }
  
  doc.text('Dear Sir/Ma\'am,', 14, greetingY);
  doc.text('Please find our purchase order details below:', 14, greetingY + 6);

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
      `\n${item.product.name}\n${item.product.details?.details || item.product.description ? (item.product.details?.details || item.product.description) + '\n' : ''}${item.product.specification ? `Size/Spec: ${item.product.specification}` : ''}`.trim(),
      item.product.details?.measuringMetric || '-',
      numericPrice === 0 ? '-' : numericPrice === 0 ? '-' : numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.quantity.toString(),
      `${amount === 0 ? '-' : amount === 0 ? '-' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  await addSignatureToPDF(doc, 145, tY - 25);
  doc.line(14, tY, 196, tY);
  
  tY += 8;
  doc.setFontSize(9);
  setGrayText();
  doc.text('Thank you for your business!', 105, tY, { align: 'center' });
  doc.text('For any queries, please contact us at +91-7878590209', 105, tY + 5, { align: 'center' });
  
  addPageBorder(doc);
  doc.save(`PO-${poNumber}.pdf`);
};

export const generateDispatchPDF = async (order: any, showFare: boolean, docType: 'Challan' | 'Dispatch Notice' | 'Packing List' = 'Challan') => {
  const doc = new jsPDF();
  const setBlackText = () => doc.setTextColor(0, 0, 0);
  const setGrayText = () => doc.setTextColor(100, 100, 100);

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 40, 'F');

  // Company Info
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Srk Modular furniture co.', 105, 18, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setGrayText();
  doc.text('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', 105, 24, { align: 'center' });
  doc.text('Mobile: +91-7878590209 | Email: Sales@srkmodular.com', 105, 29, { align: 'center' });
  doc.text('GSTIN: 08AAIPM7265R1ZR', 105, 34, { align: 'center' });

  // Border Line
  doc.setDrawColor(139, 69, 19);
  doc.setLineWidth(1);
  doc.line(14, 42, 196, 42);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setBlackText();
  doc.text(docType.toUpperCase(), 105, 52, { align: 'center' });

  // Consignee & Challan Details
  doc.setFontSize(10);
  
  // Left Column: Consignee Details
  doc.setFont("helvetica", "bold");
  doc.text('Consignee Details:', 14, 62);
  doc.setFont("helvetica", "normal");
  const nameLines = doc.splitTextToSize(`Name: ${order.customer || 'N/A'}`, 90);
  doc.text(nameLines, 14, 68);
  
  let leftY = 68 + (nameLines.length * 6) - 6;
  const contact = order.details?.mobileNumber || 'N/A';
  doc.text(`Contact: ${contact}`, 14, leftY + 6);
  leftY += 6;
  
  const gstin = order.details?.gst || 'N/A';
  if (gstin && gstin !== 'N/A') {
    doc.text(`GSTIN: ${gstin}`, 14, leftY + 6);
    leftY += 6;
  }
  
  const address = order.dispatchAddress || order.details?.address || 'N/A';
  const addressLines = doc.splitTextToSize(`Address: ${address}`, 90);
  doc.text(addressLines, 14, leftY + 6);

  // Right Column: Challan/Dispatch Details
  doc.setFont("helvetica", "bold");
  doc.text(`${docType} Details:`, 196, 62, { align: 'right' });
  doc.setFont("helvetica", "normal");
  
  const prefix = docType === 'Challan' ? 'CHL' : (docType === 'Packing List' ? 'PKL' : 'DSN');
  const challanNo = order.challanNumber || `${prefix}-${order.id || order.docId}`;
  doc.text(`${docType} No: ${challanNo}`, 196, 68, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 196, 74, { align: 'right' });
  
  const vNum = order.vehicleNumber || order.details?.vehicleNumber || 'N/A';
  doc.text(`Vehicle No: ${vNum}`, 196, 80, { align: 'right' });
  
  const reason = order.reasonForTransport || order.details?.reasonForTransport || 'Delivery';
  doc.text(`Reason for Transport: ${reason}`, 196, 86, { align: 'right' });
  
  let rightY = 92;
  const logisticCharge = order.logisticCharges || order.details?.logisticCharges;
  if (logisticCharge) {
    doc.text(`Logistic Charges: ${logisticCharge}`, 196, rightY, { align: 'right' });
    rightY += 6;
  }
  
  const driverName = order.driverName || order.details?.driverName;
  if (driverName && driverName !== 'N/A') {
    doc.text(`Driver: ${driverName}`, 196, rightY, { align: 'right' });
    rightY += 6;
  }
  
  const driverPhone = order.driverMobile || order.details?.driverMobile;
  if (driverPhone && driverPhone !== 'N/A') {
    doc.text(`Driver Mobile: ${driverPhone}`, 196, rightY, { align: 'right' });
  }

  let startY = Math.max(105, rightY + 10);
  
  // For Delivery Challan: ONLY include items actively selected for this challan.
  // Items that are already fully scheduled in previous challans or not dispatched must NOT be included!
  let items: any[] = [];
  if (order.challanItems && Array.isArray(order.challanItems) && order.challanItems.length > 0) {
    items = order.challanItems;
  } else {
    const rawProds = order.details?.products || [];
    const activeDispatched = rawProds.filter((p: any) => {
      if (!p || !p.isDispatched) return false;
      const scheduled = Number(p.scheduledQuantity) || 0;
      const total = Number(p.quantity) || 1;
      const isAlreadyFull = total > 0 && scheduled >= total;
      if (isAlreadyFull) return false; // Exclude already fully scheduled items
      const rawQty = (p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null) 
        ? Number(p.dispatchedQuantity) 
        : Math.max(0, total - scheduled);
      return rawQty > 0;
    });

    if (activeDispatched.length > 0) {
      items = activeDispatched;
    } else if (docType !== 'Challan') {
      items = rawProds;
    } else {
      items = [];
    }
  }

  const tableBody: any[][] = [];
  if (items && items.length > 0) {
    items.forEach((item: any, index: number) => {
      const scheduled = Number(item?.scheduledQuantity) || 0;
      const total = Number(item?.quantity) || 1;
      const rawQty = (item?.dispatchedQuantity !== undefined && item?.dispatchedQuantity !== null && Number(item?.dispatchedQuantity) > 0)
        ? item.dispatchedQuantity
        : Math.max(1, total - scheduled);
      const qtyStr = String(rawQty ?? 1);
      const nameStr = String(item?.name || item?.productName || item?.description || `Item ${index + 1}`);
      const sizeStr = String(item?.size || item?.spec || '-');
      
      tableBody.push([
        (index + 1).toString(),
        nameStr,
        qtyStr,
        sizeStr
      ]);
    });
  } else {
    tableBody.push(['1', 'Items as per order specification', '1', '-']);
  }

  autoTable(doc, {
    startY,
    head: [['Sl.', 'Product Name', 'Dispatched Qty', 'Size/Spec']],
    body: tableBody,
    headStyles: {
      fillColor: [139, 69, 19],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  const lastTable = (doc as any).lastAutoTable;
  const finalY = (lastTable && typeof lastTable.finalY === 'number') ? lastTable.finalY + 15 : startY + 40;

  if (showFare && order.amount) {
     doc.setFont("helvetica", "bold");
     doc.text(`Order Value / Fare: ${order.amount}`, 14, finalY);
  }

  doc.setFont("helvetica", "normal");
  setGrayText();
  doc.text('Please verify the items upon receipt.', 105, finalY + 30, { align: 'center' });
  doc.text('Thank you for choosing Srk Modular furniture co.', 105, finalY + 35, { align: 'center' });

  try {
    await addSignatureToPDF(doc, 145, finalY + 15);
  } catch (sigErr) {
    console.warn('Error adding signature:', sigErr);
  }

  try {
    addPageBorder(doc);
  } catch (borderErr) {
    console.warn('Error adding border:', borderErr);
  }

  const cleanDocType = docType.replace(/ /g, '-');
  const orderIdentifier = order.id || order.docId || 'order';
  const fileName = `${cleanDocType}-${orderIdentifier}.pdf`;

  try {
    // Generate blob and trigger download via object URL (works reliably in all environments and iframes)
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2500);

    return { success: true, fileName, blob: pdfBlob, blobUrl };
  } catch (blobErr) {
    console.warn('Blob download attempt failed, falling back to doc.save:', blobErr);
    doc.save(fileName);
    return { success: true, fileName };
  }
};


export const generatePaymentReminderPDF = async (order: any, paymentRecord?: any) => {
  if (!paymentRecord && order) {
    try {
      paymentRecord = await getPaymentForOrder(order.id || order.docId, order.docId);
    } catch (e) {
      console.warn('Could not load payment record for reminder PDF:', e);
    }
  }

  const doc = new jsPDF();
  const setBlackText = () => doc.setTextColor(0, 0, 0);
  const setGrayText = () => doc.setTextColor(100, 100, 100);

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 40, 'F');

  // Company Info
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Srk Modular furniture co.', 105, 18, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setGrayText();
  doc.text('7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India', 105, 24, { align: 'center' });
  doc.text('Mobile: +91-7878590209 | Email: Sales@srkmodular.com', 105, 29, { align: 'center' });
  doc.text('GSTIN: 08AAIPM7265R1ZR', 105, 34, { align: 'center' });

  // Border Line
  doc.setDrawColor(139, 69, 19);
  doc.setLineWidth(1);
  doc.line(14, 42, 196, 42);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setBlackText();
  doc.text('PAYMENT REMINDER', 105, 52, { align: 'center' });

  // Order Info
  doc.setFontSize(10);
  doc.text(`Order ID: ${order.id || order.docId}`, 14, 65);
  
  let leftY = 71;
  const customerLines = doc.splitTextToSize(`Customer Name: ${order.customer}`, 180);
  doc.text(customerLines, 14, leftY);
  leftY += (customerLines.length * 5) + 1;
  
  if (order.details?.companyName) {
    const companyLines = doc.splitTextToSize(`Company: ${order.details.companyName}`, 180);
    doc.text(companyLines, 14, leftY);
    leftY += (companyLines.length * 5) + 1;
  }
  
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 196, 65, { align: 'right' });
  
  doc.setFont("helvetica", "normal");
  const msg = "Please find the details of the items dispatched. We request you to kindly process the pending payment for the dispatched quantity as per the details below.";
  const msgLines = doc.splitTextToSize(msg, 180);
  
  let startY = Math.max(85, leftY + 5);
  doc.text(msgLines, 14, startY);
  
  startY += (msgLines.length * 5) + 5;
  
  const dispatchedProducts = (order.details?.products || []).filter((p: any) => p.isDispatched);
  const items = dispatchedProducts.length > 0 ? dispatchedProducts : (order.details?.products || []);

  const tableBody: any[][] = [];
  let totalAmount = 0;

  items.forEach((item: any, index: number) => {
    let perUnitPriceStr = item.rate || item.details?.perUnitPrice || item.price || item.unitPrice || item.unit_price || '';
    let numericPrice = 0;
    if (perUnitPriceStr && perUnitPriceStr !== '0') {
      const numericPriceMatch = String(perUnitPriceStr).match(/\d[\d,.]*/);
      numericPrice = numericPriceMatch ? parseFloat(numericPriceMatch[0].replace(/,/g, '')) : 0;
    }
    
    let qty = parseInt(item.dispatchedQuantity || item.quantity);
    if (isNaN(qty) || qty === 0) qty = item.quantity ? parseInt(item.quantity) : 0;

    if (numericPrice === 0) {
      // try to derive from amount if rate is missing
      let amtStr = item.amount || item.total || item.lineTotal || '';
      if (amtStr && amtStr !== '0') {
         const amtMatch = String(amtStr).match(/\d[\d,.]*/);
         const numericAmt = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, '')) : 0;
         if (numericAmt > 0 && qty > 0) {
           numericPrice = numericAmt / qty;
         }
      }
    }
    if (isNaN(numericPrice)) numericPrice = 0;

    const amount = numericPrice * qty;
    totalAmount += amount;

    tableBody.push([
      (index + 1).toString(),
      item.name,
      qty.toString(),
      numericPrice === 0 ? '-' : numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      amount === 0 ? '-' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);
  });

  autoTable(doc, {
    startY,
    head: [['Sl.', 'Product Name', 'Dispatched Qty', 'Unit Price', 'Amount (INR)']],
    body: tableBody,
    headStyles: {
      fillColor: [139, 69, 19],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 70 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals box
  let finalSubtotal = totalAmount;
  let finalGst = totalAmount * 0.18;
  let finalGrandTotal = totalAmount + finalGst;

  if (finalSubtotal === 0 && order.amount) {
    const amtMatch = String(order.amount).match(/\d[\d,.]*/);
    if (amtMatch) {
       const parsedTotal = parseFloat(amtMatch[0].replace(/,/g, ''));
       if (parsedTotal > 0) {
          finalGrandTotal = parsedTotal;
          finalSubtotal = parsedTotal / 1.18;
          finalGst = parsedTotal - finalSubtotal;
       }
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(130, finalY, 66, 35, 'F');
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setBlackText();
  doc.text('Subtotal:', 135, finalY + 10);
  doc.text(`${finalSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 10, { align: 'right' });
  
  doc.text('GST (18%):', 135, finalY + 20);
  doc.text(`${finalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 20, { align: 'right' });
  
  doc.setFont("helvetica", "bold");
  doc.text('Grand Total:', 135, finalY + 30);
  doc.text(`${finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, finalY + 30, { align: 'right' });

  // Dispatched Amounts & Bank Details
  let tY = finalY + 10;
  const checkPageBreak = (needed: number = 10) => {
    if (tY + needed > 275) {
      doc.addPage();
      tY = 20;
    }
  };

  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Order & Dispatch Summary:', 14, tY);
  
  doc.setFont("helvetica", "normal");
  setBlackText();
  tY += 6;
  doc.text(`Total Order Value: ${order.amount || 'N/A'}`, 14, tY);

  if (paymentRecord && paymentRecord.phases && paymentRecord.phases.length > 0) {
    const parseVal = (str: string | undefined, baseTotal: number = 0) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\d[\d,]*(\.\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
    const orderAmt = matchOrder ? parseFloat(matchOrder[0].replace(/,/g, "")) : 0;

    const grandTotal = parseVal(paymentRecord.grandTotal) || orderAmt;
    // Grand Total ALREADY includes transportation, installation, and taxes
    const displayTotalAmt = grandTotal;

    const receivedPhases = paymentRecord.phases.filter((p: any) => p.status === 'Received');
    let advanceReceived = 0;
    let phasesReceived = 0;
    
    let totalGstSubtracted = 0;
    receivedPhases.forEach((p: any) => {
      const phaseAmt = parseVal(p.amount, grandTotal);
      if (p.title && p.title.toLowerCase().includes('advance')) {
        advanceReceived += phaseAmt;
      } else {
        phasesReceived += phaseAmt;
      }
      const adj = calculatePhaseGstAdjustment(p.amount, p.sourceType, p.bankName, 18, grandTotal);
      totalGstSubtracted += adj.gstAmount;
    });

    const totalReceived = advanceReceived + phasesReceived;
    const remainingPayment = Math.max(0, displayTotalAmt - totalReceived - totalGstSubtracted);

    if (receivedPhases.length > 0) {
      tY += 6;
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.text("Past Payments Received:", 14, tY);
      doc.setFont("helvetica", "normal");
      
      receivedPhases.forEach((p: any) => {
        tY += 5;
        checkPageBreak(5);
        const phaseAmt = parseVal(p.amount, grandTotal);
        const formattedAmt = phaseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const dateStr = p.date ? ` (Date: ${p.date})` : '';
        const titleStr = p.title ? p.title : 'Payment';
        doc.text(`- ${titleStr}${dateStr}: Rs. ${formattedAmt}`, 18, tY);
      });
      tY += 2;
    }
    tY += 6;
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Red color for remaining payment
    doc.text(`Remaining Payment: ${remainingPayment > 0 ? remainingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}`, 14, tY);
    doc.setFont("helvetica", "normal");
    setBlackText();
  }
  
  if (order.details?.firstDispatchAmount) {
    tY += 6;
    checkPageBreak(10);
    doc.text(`First Dispatched Amount: ${order.details.firstDispatchAmount}`, 14, tY);
  }
  
  if (order.details?.secondDispatchAmount) {
    tY += 6;
    checkPageBreak(10);
    doc.text(`Second Dispatched Amount: ${order.details.secondDispatchAmount}`, 14, tY);
  }
  
  tY += 6;
  checkPageBreak(10);
  const currAmt = finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.text(`Current Dispatched Amount: ${currAmt}`, 14, tY);

  tY += 10;
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Bank Details:', 14, tY);
  
  doc.setFont("helvetica", "normal");
  setBlackText();
  
  if (order.details?.bankDetails) {
    const bdLines = doc.splitTextToSize(order.details.bankDetails, 100);
    checkPageBreak(bdLines.length * 5 + 6);
    doc.text(bdLines, 14, tY + 6);
    tY += (bdLines.length * 5) + 6;
  } else {
    checkPageBreak(30);
    doc.text('Account Name: Srk Modular furniture co.', 14, tY + 6);
    doc.text('Bank Name: State Bank of India', 14, tY + 12);
    doc.text('Account No: 31766643906', 14, tY + 18);
    doc.text('IFSC Code: SBIN0060229', 14, tY + 24);
    tY += 24;
  }
  
  // Footer
  checkPageBreak(40);
  tY = Math.max(tY + 15, finalY + 55 < 275 && tY < finalY + 55 ? finalY + 55 : tY + 15);
  doc.setDrawColor(139, 69, 19);
  doc.setLineWidth(0.5);
  await addSignatureToPDF(doc, 145, tY - 25);
  doc.line(14, tY, 196, tY);
  
  tY += 8;
  doc.setFontSize(9);
  setGrayText();
  doc.text('Thank you for choosing Srk Modular furniture co.', 105, tY, { align: 'center' });
  doc.text('For any queries, please contact us at +91-7878590209', 105, tY + 5, { align: 'center' });
  
  addPageBorder(doc);
  const fileName = `Payment-Reminder-${order.id || order.docId}.pdf`;
  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2500);
    return { success: true, fileName };
  } catch (err) {
    console.warn('Blob download failed, falling back to doc.save:', err);
    doc.save(fileName);
    return { success: true, fileName };
  }
};

export const generateSatisfactionFormPDF = async (order: any, installerDetails: any) => {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFillColor(139, 69, 19);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text('SRK MODULAR FURNITURE CO', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text('Customer Satisfaction Letter', 105, 30, { align: 'center' });
  
  y = 50;
  doc.setTextColor(0, 0, 0);

  // Customer & Order Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text('Order Details', 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 8;
  doc.text(`Order ID: ${order.id || order.docId || 'N/A'}`, 14, y);
  doc.text(`Installation Date: ${order.details?.installationDate || 'N/A'}`, 120, y);
  
  y += 8;
  const customerLines = doc.splitTextToSize(`Customer Name: ${order.customer || 'N/A'}`, 180);
  doc.text(customerLines, 14, y);
  y += (customerLines.length * 6);
  
  const projectLines = doc.splitTextToSize(`Project Name: ${order.project || 'N/A'}`, 180);
  doc.text(projectLines, 14, y);
  y += (projectLines.length * 6);

  // Installer Info
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text('Installation Team Details', 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 8;
  const installerLines = doc.splitTextToSize(`Primary Installer: ${installerDetails?.name || order.details?.installerName || 'N/A'}`, 180);
  doc.text(installerLines, 14, y);
  y += (installerLines.length * 6);
  if (installerDetails?.mobileNumber) {
    doc.text(`Contact: ${installerDetails.mobileNumber}`, 14, y);
    y += 8;
  }
  const helperLines = doc.splitTextToSize(`Helpers: ${order.details?.installationHelpers || 'None'}`, 180);
  doc.text(helperLines, 14, y);
  y += (helperLines.length * 6) - 6;
  
  let currentYForDetails = y;

  if (installerDetails?.imageUrl) {
    try {
      // Add the installer image to the right side
      doc.addImage(installerDetails.imageUrl, 'JPEG', 150, currentYForDetails - 25, 40, 40);
    } catch (e) {
      console.warn("Could not load installer image for PDF", e);
    }
  }

  if (installerDetails?.portfolio) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('Installer Experience & Portfolio:', 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitPortfolio = doc.splitTextToSize(installerDetails.portfolio, 130); // Reduced width to avoid overlapping image
    doc.text(splitPortfolio, 14, y + 6);
    y += Math.max((splitPortfolio.length * 5) + 6, installerDetails?.imageUrl ? 30 : 0);
  } else {
    y += Math.max(10, installerDetails?.imageUrl ? 20 : 0);
  }

  // Items Installed
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text('Items Installed', 14, y);
  y += 4;
  
  const rawProducts = order.details?.products || [];
  const hasDispatchInfo = rawProducts.some((p: any) => p.isDispatched || (p.dispatchedQuantity !== undefined && Number(p.dispatchedQuantity) > 0));

  const installProducts = rawProducts.filter((p: any) => {
    const reqInstall = p.requiresInstallation !== false;
    if (hasDispatchInfo) {
      return reqInstall && (p.isDispatched || (p.dispatchedQuantity !== undefined && Number(p.dispatchedQuantity) > 0));
    }
    return p.requiresInstallation;
  });

  const products = installProducts.length > 0 
    ? installProducts 
    : rawProducts.filter((p: any) => p.requiresInstallation);
  
  if (products.length > 0) {
    const tableData = products.map((p: any, index: number) => {
      const effectiveQty = (p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null && Number(p.dispatchedQuantity) > 0)
        ? Number(p.dispatchedQuantity)
        : (Number(p.quantity) || 1);
      
      const isPartial = p.dispatchedQuantity !== undefined && p.dispatchedQuantity !== null && Number(p.dispatchedQuantity) > 0 && Number(p.dispatchedQuantity) < Number(p.quantity);
      let desc = p.name || '-';
      if (p.size) desc += ` - ${p.size}`;
      if (isPartial) desc += ` (Partial Dispatch: ${effectiveQty} of ${p.quantity})`;

      return [
        index + 1,
        desc,
        effectiveQty
      ];
    });
    
    autoTable(doc, {
      startY: y,
      head: [['S.No', 'Product Description', 'Qty']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 69, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text('No items specified for installation.', 14, y + 5);
    y += 15;
  }

  // Satisfaction Form Checklist
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text('Customer Feedback Checklist', 14, y);
  y += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const checklist = [
    "Were the installation team members professional and courteous?",
    "Was the installation completed to your satisfaction?",
    "Was the work area left clean and tidy after the installation?",
    "Were you given instructions on how to use/maintain the products?",
    "Are all the items accounted for and free of defects?"
  ];
  
  checklist.forEach((item, index) => {
    doc.rect(14, y - 4, 4, 4);
    doc.text(item, 22, y);
    doc.text("Yes  /  No", 170, y);
    y += 8;
  });
  
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Additional Comments:", 14, y);
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y + 8, 196, y + 8);
  doc.line(14, y + 18, 196, y + 18);
  doc.line(14, y + 28, 196, y + 28);
  
  // Signatures
  y += 45;
  doc.setFont("helvetica", "bold");
  doc.text("Customer Signature", 14, y);
  doc.text("Installer Signature", 150, y);
  
  doc.setDrawColor(0, 0, 0);
  doc.line(14, y - 5, 60, y - 5);
  doc.line(150, y - 5, 196, y - 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Name: ______________________", 14, y + 8);
  doc.text("Date: ______________________", 150, y + 8);

  try {
    const qrResponse = await fetch('/google-qr.png');
    if (qrResponse.ok) {
      const qrBlob = await qrResponse.blob();
      const qrBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });
      
      // Add a new page for the QR code
      doc.addPage();
      
      // Add heading text for the review page
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(139, 69, 19); // Brand color
      doc.text("Leave us a Review!", 105, 40, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Your feedback helps us improve and serve you better.", 105, 50, { align: 'center' });

      // Place QR code prominently on the new page (scaled up significantly)
      // x=35, y=70, width=140, height=155
      doc.addImage(qrBase64, 'PNG', 35, 70, 140, 160);
    }
  } catch (e) {
    console.warn('Could not load google-qr.png for PDF', e);
  }
  
  addPageBorder(doc);
  doc.save(`Customer-Satisfaction-Letter-${order.id || order.docId}.pdf`);
};

export interface QuotationData {
  quotationNo: string;
  quotationDate: string;
  validTillDate: string;
  customerName: string;
  companyName?: string;
  gstNumber?: string;
  customerAddress?: string;
  customerMobile: string;
  customerEmail?: string;
  signedByName?: string;
  signedByEmail?: string;
  signedAt?: string;
  items: Array<{
    product: any;
    selectedVariant?: any;
    variantIds?: string[];
    selectedOptionsSummary?: string;
    imageSrc?: string;
    unitPrice: number;
    quantity: number;
    discountPct?: number;
    amount: number;
  }>;
  subtotal: number;
  discountTotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  notes?: string;
  paymentTerms?: string;
}

export const generateQuotationPDF = async (quote: QuotationData) => {
  // A4 Portrait orientation: 210mm width x 297mm height
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const setBlackText = () => doc.setTextColor(15, 23, 42);
  const setGrayText = () => doc.setTextColor(100, 116, 139);

  // Fetch company logo & item images cleanly
  let logoBase64: string | null = null;
  try {
    const logoResp = await fetch('/logo.png');
    if (logoResp.ok) {
      const logoBlob = await logoResp.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });
    }
  } catch {
    logoBase64 = null;
  }

  const images: Record<number, string> = {};
  for (let i = 0; i < quote.items.length; i++) {
    const item = quote.items[i];
    if (item.imageSrc) {
      images[i] = item.imageSrc;
      continue;
    }
    if (item.selectedVariant?.imageData) {
      images[i] = item.selectedVariant.imageData;
      continue;
    }

    try {
      let resolvedImg: string | undefined;

      // 1. Direct selected variant file (e.g., explicitly chosen Chrome base or variant)
      if (item.selectedVariant?.id) {
        const vImg = await getVariantFile(item.selectedVariant.id);
        if (vImg) resolvedImg = vImg;
      }

      // 2. Check all selected variantIds (reverse order prioritizes later custom option like Base)
      if (!resolvedImg && Array.isArray(item.variantIds) && item.variantIds.length > 0) {
        const prodVariants: any[] = Array.isArray(item.product?.variants) ? item.product.variants : [];
        for (let k = item.variantIds.length - 1; k >= 0; k--) {
          const vid = item.variantIds[k];
          if (!vid) continue;
          const inlineMatch = prodVariants.find((pv) => pv && pv.id === vid && pv.imageData);
          if (inlineMatch?.imageData) {
            resolvedImg = inlineMatch.imageData;
            break;
          }
          const vImg = await getVariantFile(vid);
          if (vImg) {
            resolvedImg = vImg;
            break;
          }
        }
      }

      // 3. Fallback: match variants mentioned in selectedOptionsSummary (prefer non-color custom/base variants first)
      if (!resolvedImg && item.selectedOptionsSummary && Array.isArray(item.product?.variants)) {
        const summaryLower = item.selectedOptionsSummary.toLowerCase();
        const matchingVars = item.product.variants.filter((pv: any) => {
          if (!pv) return false;
          const vName = (pv.name || pv.size || pv.color || '').toLowerCase().trim();
          const gName = (pv.groupName || '').toLowerCase().trim();
          if (!vName) return false;
          if (gName) {
            return (
              summaryLower.includes(`${gName}: ${vName}`) ||
              summaryLower.includes(vName)
            );
          }
          return summaryLower.includes(vName);
        });
        // Check in reverse order so structural options (e.g., Base: Chrome) beat generic Color if both exist
        for (let k = matchingVars.length - 1; k >= 0; k--) {
          const mv = matchingVars[k];
          if (mv.imageData) {
            resolvedImg = mv.imageData;
            break;
          }
          if (mv.id) {
            const vImg = await getVariantFile(mv.id);
            if (vImg) {
              resolvedImg = vImg;
              break;
            }
          }
        }
      }

      // 4. Fallback to product base image
      if (!resolvedImg && item.product?.details?.productImageData) {
        resolvedImg = item.product.details.productImageData;
      }
      if (!resolvedImg) {
        const idToFetch = item.product?.docId || item.product?.id;
        if (idToFetch) {
          const imgData = await getProductFile(idToFetch);
          if (imgData) resolvedImg = imgData;
        }
      }

      if (resolvedImg) {
        images[i] = resolvedImg;
      }
    } catch (e) {
      console.error('Could not fetch quotation item image', e);
    }
  }

  // 1. Header Letterhead Band (inside border: x=7..203, y=7..36)
  doc.setFillColor(248, 250, 252);
  doc.rect(7, 7, 196, 29, 'F');

  const textStartX = logoBase64 ? 38 : 105;
  const textAlign: 'left' | 'center' = logoBase64 ? 'left' : 'center';

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 12, 10.5, 21, 21);
    } catch {
      // Fallback gracefully if logo fails to render
    }
  }

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('SRK MODULAR FURNITURE CO.', textStartX, 16, { align: textAlign });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setGrayText();
  doc.text(
    '7 Km, Behind Halt Restaurant, Agra Road, Jaipur, Rajasthan - 302031, India',
    textStartX,
    21.5,
    { align: textAlign }
  );
  doc.text(
    'Mobile: +91-7878590209  |  Email: Sales@srkmodular.com  |  Web: srkmodular.com',
    textStartX,
    26,
    { align: textAlign }
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('GSTIN: 08AAIPM7265R1ZR', textStartX, 30.8, { align: textAlign });

  // Accent Rule
  doc.setDrawColor(139, 69, 19);
  doc.setLineWidth(0.7);
  doc.line(12, 36.5, 198, 36.5);

  // 2. Title Ribbon
  doc.setFillColor(139, 69, 19);
  doc.roundedRect(12, 39, 186, 8.5, 1.5, 1.5, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COMMERCIAL QUOTATION', 105, 44.7, { align: 'center' });

  // 3. Two-Column Symmetrical Info Cards (186mm total width: 90.5 + 5 + 90.5)
  const cardTopY = 50.5;
  const leftCardX = 12;
  const rightCardX = 107.5;
  const cardW = 90.5;

  // Pre-calculate wrapped lines for both cards so heights stay balanced
  const custLines: Array<{ text: string; bold?: boolean }> = [];
  const pushWrapped = (
    target: Array<{ text: string; bold?: boolean }>,
    text: string,
    bold?: boolean
  ) => {
    const wrapped = doc.splitTextToSize(text, cardW - 8);
    wrapped.forEach((ln: string, idx: number) =>
      target.push({ text: ln, bold: bold && idx === 0 })
    );
  };

  pushWrapped(custLines, `Buyer: ${quote.customerName || 'N/A'}`, true);
  if (quote.companyName) pushWrapped(custLines, `Company: ${quote.companyName}`);
  if (quote.customerMobile) pushWrapped(custLines, `Mobile: ${quote.customerMobile}`);
  if (quote.customerEmail) pushWrapped(custLines, `Email: ${quote.customerEmail}`);
  if (quote.gstNumber) pushWrapped(custLines, `GSTIN: ${quote.gstNumber}`);
  if (quote.customerAddress) pushWrapped(custLines, `Address: ${quote.customerAddress}`);

  const metaLines: Array<{ text: string; bold?: boolean }> = [];
  pushWrapped(metaLines, `Quotation No: ${quote.quotationNo}`, true);
  pushWrapped(metaLines, `Date: ${quote.quotationDate}`);
  pushWrapped(metaLines, `Valid Until: ${quote.validTillDate || '15 Days'}`);
  pushWrapped(
    metaLines,
    `Payment: ${quote.paymentTerms || '50% Advance, 50% Before Dispatch'}`
  );

  const maxLines = Math.max(custLines.length, metaLines.length);
  const cardH = Math.max(34, 12 + maxLines * 4.5 + 3);

  // Draw Left Card (Customer Details)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.roundedRect(leftCardX, cardTopY, cardW, cardH, 1.5, 1.5, 'FD');
  doc.setFillColor(248, 250, 252);
  doc.rect(leftCardX + 0.2, cardTopY + 0.2, cardW - 0.4, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('CUSTOMER DETAILS', leftCardX + 4, cardTopY + 5);

  let cy = cardTopY + 12;
  doc.setFontSize(8.5);
  custLines.forEach((line) => {
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    setBlackText();
    doc.text(line.text, leftCardX + 4, cy);
    cy += 4.5;
  });

  // Draw Right Card (Quotation Details)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightCardX, cardTopY, cardW, cardH, 1.5, 1.5, 'FD');
  doc.setFillColor(248, 250, 252);
  doc.rect(rightCardX + 0.2, cardTopY + 0.2, cardW - 0.4, 7, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('QUOTATION DETAILS', rightCardX + 4, cardTopY + 5);

  let my = cardTopY + 12;
  doc.setFontSize(8.5);
  metaLines.forEach((line) => {
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    setBlackText();
    doc.text(line.text, rightCardX + 4, my);
    my += 4.5;
  });

  // 4. Items Table (186mm exact total width: 9 + 20 + 80 + 12 + 26 + 12 + 27 = 186mm)
  const tableBody: any[][] = [];
  quote.items.forEach((item, index) => {
    const prodName = item.product?.name || item.product?.productName || 'Custom Modular Product';
    const rawSpec = item.selectedOptionsSummary || item.product?.specification || item.selectedVariant?.size || '';
    const specLine = rawSpec && rawSpec !== '-' ? `\n${rawSpec}` : '';
    const unitP = item.unitPrice || 0;
    const discPct = item.discountPct || 0;
    const qty = item.quantity || 1;
    const amt = typeof item.amount === 'number' ? item.amount : unitP * qty * (1 - discPct / 100);

    tableBody.push([
      (index + 1).toString(),
      '', // Thumbnail slot
      `${prodName}${specLine}`,
      qty.toString(),
      `INR ${unitP.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      discPct > 0 ? `${discPct}%` : '-',
      `INR ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
  });

  const tableStartY = cardTopY + cardH + 5;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 12, right: 12, top: 14, bottom: 22 },
    head: [['Sl.', 'Image', 'Product & Specification', 'Qty', 'Unit Price', 'Disc', 'Amount']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 69, 19],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 2.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252]
    },
    bodyStyles: { minCellHeight: 18 },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 80, halign: 'left' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const imgData = images[data.row.index];
        if (imgData && imgData.startsWith('data:image')) {
          const imgSize = 14;
          const x = data.cell.x + (data.cell.width - imgSize) / 2;
          const y = data.cell.y + (data.cell.height - imgSize) / 2;
          try {
            let format = 'JPEG';
            if (imgData.includes('image/png')) format = 'PNG';
            else if (imgData.includes('image/webp')) format = 'WEBP';
            doc.addImage(imgData, format, x, y, imgSize, imgSize);
          } catch (e) {
            console.error('Error drawing image in quotation cell', e);
          }
        }
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 6;
  const subtotal = typeof quote.subtotal === 'number' ? quote.subtotal : 0;
  const gstRate = typeof quote.gstRate === 'number' ? quote.gstRate : 18;
  const gstAmount =
    typeof quote.gstAmount === 'number' ? quote.gstAmount : (subtotal * gstRate) / 100;
  const grandTotal =
    typeof quote.grandTotal === 'number' ? quote.grandTotal : subtotal + gstAmount;

  const totalsBoxW = 80;
  const hasDiscount = (quote.discountTotal || 0) > 0;
  const totalsBoxH = hasDiscount ? 36 : 30;

  // Prepare E-Sign Verification Seal text before page-break check
  const signerDisplayName = (quote.signedByName || 'SRK Authorised Signatory').trim();
  const signerVerifyText = `E-Signed & Verified by ${signerDisplayName}`;
  doc.setFontSize(7.4);
  const signerVerifyLines = doc.splitTextToSize(signerVerifyText, totalsBoxW - 14);
  const signedTimestampLabel = quote.signedAt
    ? new Date(quote.signedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : quote.quotationDate || new Date().toLocaleDateString('en-GB');
  const signerMetaLine = quote.signedByEmail
    ? `ID: ${quote.signedByEmail}  |  ${signedTimestampLabel}`
    : `Verified: ${signedTimestampLabel}`;
  doc.setFontSize(6.4);
  const signerMetaLines = doc.splitTextToSize(signerMetaLine, totalsBoxW - 14);
  const sealH = 7.5 + signerVerifyLines.length * 3.5 + signerMetaLines.length * 3.1 + 2;

  doc.setFontSize(7.8);
  const defaultNotes =
    quote.notes ||
    '1. Prices are valid until the specified expiry date.\n2. Standard GST applicable as quoted.\n3. Delivery timeframe: 10-15 business days from order confirmation & advance.\n4. Warranty: 1 Year Manufacturing Defect Warranty.';
  const notesLines = doc.splitTextToSize(defaultNotes, 100);
  const leftBlockH = 3 + 4.5 + notesLines.length * 3.8 + 4 + 9;
  const rightBlockH = totalsBoxH + 4 + 27 + sealH;
  const neededBottomH = Math.max(leftBlockH, rightBlockH);

  // Ensure bottom summary, bank details, and e-sign seal fit cleanly above footer (footer starts at y=281)
  if (finalY + neededBottomH > 276) {
    doc.addPage();
    finalY = 16;
  }

  // 5. Totals Card (Right Side: x=118..198, w=80mm) & Terms/Bank (Left Side: x=12..112, w=100mm)
  const totalsBoxX = 118;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(totalsBoxX, finalY, totalsBoxW, totalsBoxH, 1.5, 1.5, 'FD');

  let ty = finalY + 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  setBlackText();
  doc.text('Subtotal:', totalsBoxX + 4, ty);
  doc.text(
    `INR ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsBoxX + totalsBoxW - 4,
    ty,
    { align: 'right' }
  );

  if (hasDiscount) {
    ty += 6;
    doc.setTextColor(5, 150, 105);
    doc.text('Discount:', totalsBoxX + 4, ty);
    doc.text(
      `-INR ${quote.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalsBoxX + totalsBoxW - 4,
      ty,
      { align: 'right' }
    );
  }

  ty += 6;
  setBlackText();
  doc.text(`GST (${gstRate}%):`, totalsBoxX + 4, ty);
  doc.text(
    `INR ${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsBoxX + totalsBoxW - 4,
    ty,
    { align: 'right' }
  );

  // Highlighted Grand Total row
  const grandRowY = finalY + totalsBoxH - 10;
  doc.setFillColor(253, 244, 236);
  doc.rect(totalsBoxX + 0.3, grandRowY, totalsBoxW - 0.6, 9.7, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX, grandRowY, totalsBoxX + totalsBoxW, grandRowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(139, 69, 19);
  doc.text('Grand Total:', totalsBoxX + 4, grandRowY + 6.4);
  doc.text(
    `INR ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totalsBoxX + totalsBoxW - 4,
    grandRowY + 6.4,
    { align: 'right' }
  );

  // Left Column: Terms & Bank Details
  const notesY = finalY + 3;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('TERMS & CONDITIONS:', 12, notesY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setGrayText();
  doc.text(notesLines, 12, notesY + 4.5);

  const afterNotesY = notesY + 4.5 + notesLines.length * 3.8 + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 69, 19);
  doc.text('BANK DETAILS FOR TRANSFER:', 12, afterNotesY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  setBlackText();
  doc.text('A/C Name: Srk Modular furniture co.  |  Bank: State Bank of India', 12, afterNotesY + 4.2);
  doc.text('A/C No: 31766643906  |  IFSC: SBIN0060229', 12, afterNotesY + 8.2);

  // Right Column: Authorised Signatory & E-Signed Verification Seal
  const sigY = finalY + totalsBoxH + 4;
  await addSignatureToPDF(doc, 134, sigY - 1);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(126, sigY + 18, 194, sigY + 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setBlackText();
  doc.text('Authorised Signatory', 160, sigY + 21.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setGrayText();
  doc.text('For SRK Modular Furniture Co.', 160, sigY + 25.1, { align: 'center' });

  // E-Signed & Verified Digital Document Stamp
  const sealY = sigY + 27.5;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.roundedRect(totalsBoxX, sealY, totalsBoxW, sealH, 1.5, 1.5, 'FD');

  // Vector green verification badge checkmark
  doc.setFillColor(5, 150, 105);
  doc.circle(totalsBoxX + 6, sealY + 6, 3.1, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.line(totalsBoxX + 4.7, sealY + 6.1, totalsBoxX + 5.7, sealY + 7.1);
  doc.line(totalsBoxX + 5.7, sealY + 7.1, totalsBoxX + 7.4, sealY + 4.9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(4, 120, 87);
  doc.text('DIGITALLY E-SIGNED DOCUMENT', totalsBoxX + 11.2, sealY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(6, 78, 59);
  doc.text(signerVerifyLines, totalsBoxX + 11.2, sealY + 8.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(51, 65, 85);
  doc.text(signerMetaLines, totalsBoxX + 11.2, sealY + 8.3 + signerVerifyLines.length * 3.5);

  // Page Border & Footer across all pages
  addPageBorder(doc);
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(139, 69, 19);
    doc.setLineWidth(0.4);
    doc.line(12, 281, 198, 281);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setGrayText();
    doc.text(
      'Thank you for choosing SRK Modular Furniture Co.  |  +91-7878590209  |  Sales@srkmodular.com',
      12,
      285.5
    );
    doc.text(`Page ${i} of ${totalPages}`, 198, 285.5, { align: 'right' });
  }

  const cleanCustomerName = (quote.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Quotation-${quote.quotationNo}-${cleanCustomerName}.pdf`;

  try {
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = fileName;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();

    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2500);

    return { success: true, fileName, blob: pdfBlob, blobUrl };
  } catch (err) {
    console.warn('Fallback to doc.save for quotation:', err);
    doc.save(fileName);
    return { success: true, fileName };
  }
};

