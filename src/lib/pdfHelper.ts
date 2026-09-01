import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getProductFile } from './fileStorage';


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
        reader.onloadend = () => resolve(reader.result);
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
  doc.text(`Name: ${order.customer || 'N/A'}`, 14, 68);
  
  const contact = order.details?.mobileNumber || 'N/A';
  doc.text(`Contact: ${contact}`, 14, 74);
  
  const gstin = order.details?.gst || 'N/A';
  if (gstin && gstin !== 'N/A') {
    doc.text(`GSTIN: ${gstin}`, 14, 80);
  }
  
  const address = order.dispatchAddress || order.details?.address || 'N/A';
  const addressLines = doc.splitTextToSize(`Address: ${address}`, 90);
  doc.text(addressLines, 14, gstin && gstin !== 'N/A' ? 86 : 80);

  // Right Column: Challan/Dispatch Details
  doc.setFont("helvetica", "bold");
  doc.text(`${docType} Details:`, 196, 62, { align: 'right' });
  doc.setFont("helvetica", "normal");
  
  const prefix = docType === 'Challan' ? 'CHL' : (docType === 'Packing List' ? 'PKL' : 'DSN');
  const challanNo = `${prefix}-${order.id || order.docId}`;
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
  
  const dispatchedProducts = (order.details?.products || []).filter((p: any) => p.isDispatched);
  const items = dispatchedProducts.length > 0 ? dispatchedProducts : (order.details?.products || []);

  const tableBody: any[][] = [];
  items.forEach((item: any, index: number) => {
    tableBody.push([
      (index + 1).toString(),
      item.name,
      item.quantity.toString(),
      item.size || '-'
    ]);
  });

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

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  if (showFare && order.amount) {
     doc.setFont("helvetica", "bold");
     doc.text(`Order Value / Fare: ${order.amount}`, 14, finalY);
  }

  doc.setFont("helvetica", "normal");
  setGrayText();
  doc.text('Please verify the items upon receipt.', 105, finalY + 30, { align: 'center' });
  doc.text('Thank you for choosing Srk Modular furniture co.', 105, finalY + 35, { align: 'center' });

  await addSignatureToPDF(doc, 145, finalY + 15);
  addPageBorder(doc);
  doc.save(`${docType.replace(/ /g, '-')}-${order.id || order.docId}.pdf`);
};


export const generatePaymentReminderPDF = async (order: any, paymentRecord?: any) => {
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
  doc.text(`Customer Name: ${order.customer}`, 14, 71);
  if (order.details?.companyName) {
    doc.text(`Company: ${order.details.companyName}`, 14, 77);
  }
  
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 196, 65, { align: 'right' });
  
  doc.setFont("helvetica", "normal");
  const msg = "Please find the details of the items dispatched. We request you to kindly process the pending payment for the dispatched quantity as per the details below.";
  const msgLines = doc.splitTextToSize(msg, 180);
  doc.text(msgLines, 14, 85);

  let startY = 85 + (msgLines.length * 5) + 5;
  
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
    const transport = parseVal(paymentRecord.transportationCharges || paymentRecord.loadingCharges, grandTotal);
    const install = parseVal(paymentRecord.installationCharges, grandTotal);
    
    const displayTotalAmt = grandTotal + transport + install;

    const receivedPhases = paymentRecord.phases.filter((p: any) => p.status === 'Received');
    let advanceReceived = 0;
    let phasesReceived = 0;
    
    receivedPhases.forEach((p: any) => {
      const phaseAmt = parseVal(p.amount, grandTotal);
      if (p.title && p.title.toLowerCase().includes('advance')) {
        advanceReceived += phaseAmt;
      } else {
        phasesReceived += phaseAmt;
      }
    });

    const totalReceived = advanceReceived + phasesReceived;
    const remainingPayment = displayTotalAmt - totalReceived;

    if (receivedPhases.length > 0) {
      tY += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Past Payments Received:", 14, tY);
      doc.setFont("helvetica", "normal");
      
      receivedPhases.forEach((p: any) => {
        tY += 5;
        const phaseAmt = parseVal(p.amount, grandTotal);
        const formattedAmt = phaseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const dateStr = p.date ? ` (Date: ${p.date})` : '';
        const titleStr = p.title ? p.title : 'Payment';
        doc.text(`- ${titleStr}${dateStr}: Rs. ${formattedAmt}`, 18, tY);
      });
      tY += 2;
    }
    tY += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Remaining Payment: ${remainingPayment > 0 ? remainingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}`, 14, tY);
    doc.setFont("helvetica", "normal");
  }
  
  if (order.details?.firstDispatchAmount) {
    tY += 6;
    doc.text(`First Dispatched Amount: ${order.details.firstDispatchAmount}`, 14, tY);
  }
  
  if (order.details?.secondDispatchAmount) {
    tY += 6;
    doc.text(`Second Dispatched Amount: ${order.details.secondDispatchAmount}`, 14, tY);
  }
  
  tY += 6;
  const currAmt = finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.text(`Current Dispatched Amount: ${currAmt}`, 14, tY);

  tY += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Bank Details:', 14, tY);
  
  doc.setFont("helvetica", "normal");
  setBlackText();
  
  if (order.details?.bankDetails) {
    const bdLines = doc.splitTextToSize(order.details.bankDetails, 100);
    doc.text(bdLines, 14, tY + 6);
    tY += (bdLines.length * 5) + 6;
  } else {
    doc.text('Account Name: Srk Modular furniture co.', 14, tY + 6);
    doc.text('Bank Name: State Bank of India', 14, tY + 12);
    doc.text('Account No: 31766643906', 14, tY + 18);
    doc.text('IFSC Code: SBIN0060229', 14, tY + 24);
    tY += 24;
  }
  
  // Footer
  tY = Math.max(finalY + 55, tY + 15);
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
  doc.save(`Payment-Reminder-${order.id || order.docId}.pdf`);
};
