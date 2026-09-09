const fs = require('fs');
let content = fs.readFileSync('src/lib/pdfHelper.ts', 'utf8');

const target = `  // Dispatched Amounts & Bank Details
  let tY = finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(139, 69, 19);
  doc.text('Order & Dispatch Summary:', 14, tY);
  
  doc.setFont("helvetica", "normal");
  setBlackText();
  tY += 6;
  doc.text(\`Total Order Value: \${order.amount || 'N/A'}\`, 14, tY);

  if (paymentRecord && paymentRecord.phases && paymentRecord.phases.length > 0) {
    const parseVal = (str: string | undefined, baseTotal: number = 0) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\\d[\\d,]*(\\.\\d+)?)\\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\\d[\\d,]*(\\.\\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\\d[\\d,]*(\\.\\d+)?/);
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
        const dateStr = p.date ? \` (Date: \${p.date})\` : '';
        const titleStr = p.title ? p.title : 'Payment';
        doc.text(\`- \${titleStr}\${dateStr}: Rs. \${formattedAmt}\`, 18, tY);
      });
      tY += 2;
    }
    tY += 6;
    doc.setFont("helvetica", "bold");
    doc.text(\`Remaining Payment: \${remainingPayment > 0 ? remainingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}\`, 14, tY);
    doc.setFont("helvetica", "normal");
  }
  
  if (order.details?.firstDispatchAmount) {
    tY += 6;
    doc.text(\`First Dispatched Amount: \${order.details.firstDispatchAmount}\`, 14, tY);
  }
  
  if (order.details?.secondDispatchAmount) {
    tY += 6;
    doc.text(\`Second Dispatched Amount: \${order.details.secondDispatchAmount}\`, 14, tY);
  }
  
  tY += 6;
  const currAmt = finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.text(\`Current Dispatched Amount: \${currAmt}\`, 14, tY);

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
  doc.save(\`Payment-Reminder-\${order.id || order.docId}.pdf\`);
};`;

const replacement = `  // Dispatched Amounts & Bank Details
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
  doc.text(\`Total Order Value: \${order.amount || 'N/A'}\`, 14, tY);

  if (paymentRecord && paymentRecord.phases && paymentRecord.phases.length > 0) {
    const parseVal = (str: string | undefined, baseTotal: number = 0) => {
      if (!str) return 0;
      const strVal = str.toString();
      const pctMatch = strVal.match(/(\\d[\\d,]*(\\.\\d+)?)\\s*%/);
      if (pctMatch && baseTotal > 0) {
        const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
        return (pct / 100) * baseTotal;
      }
      const matchAmt = strVal.match(/\\d[\\d,]*(\\.\\d+)?/);
      return matchAmt ? parseFloat(matchAmt[0].replace(/,/g, "")) || 0 : 0;
    };

    const matchOrder = (order.amount || "").toString().match(/\\d[\\d,]*(\\.\\d+)?/);
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
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.text("Past Payments Received:", 14, tY);
      doc.setFont("helvetica", "normal");
      
      receivedPhases.forEach((p: any) => {
        tY += 5;
        checkPageBreak(5);
        const phaseAmt = parseVal(p.amount, grandTotal);
        const formattedAmt = phaseAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const dateStr = p.date ? \` (Date: \${p.date})\` : '';
        const titleStr = p.title ? p.title : 'Payment';
        doc.text(\`- \${titleStr}\${dateStr}: Rs. \${formattedAmt}\`, 18, tY);
      });
      tY += 2;
    }
    tY += 6;
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Red color for remaining payment
    doc.text(\`Remaining Payment: \${remainingPayment > 0 ? remainingPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}\`, 14, tY);
    doc.setFont("helvetica", "normal");
    setBlackText();
  }
  
  if (order.details?.firstDispatchAmount) {
    tY += 6;
    checkPageBreak(10);
    doc.text(\`First Dispatched Amount: \${order.details.firstDispatchAmount}\`, 14, tY);
  }
  
  if (order.details?.secondDispatchAmount) {
    tY += 6;
    checkPageBreak(10);
    doc.text(\`Second Dispatched Amount: \${order.details.secondDispatchAmount}\`, 14, tY);
  }
  
  tY += 6;
  checkPageBreak(10);
  const currAmt = finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.text(\`Current Dispatched Amount: \${currAmt}\`, 14, tY);

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
  doc.save(\`Payment-Reminder-\${order.id || order.docId}.pdf\`);
};`;

content = content.replace(target, replacement);

fs.writeFileSync('src/lib/pdfHelper.ts', content);
console.log("PDF Helper patched");
