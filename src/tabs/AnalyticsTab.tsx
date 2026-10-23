import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Download, 
  Calendar, 
  FileText, 
  Filter, 
  Wallet, 
  Landmark, 
  CreditCard, 
  ArrowDownToLine,
  CheckCircle2,
  Building2,
  Table as TableIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StatCard } from '../components/StatCard';
import { subscribeToOrders, Order } from '../lib/orders';
import { subscribeToPayments, PaymentRecord, PaymentPhase, calculatePhaseGstAdjustment } from '../lib/payments';

type TimePeriod = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';

export function AnalyticsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Payment Report Filters
  const [period, setPeriod] = useState<TimePeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');

  useEffect(() => {
    const unsubOrders = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    const unsubPayments = subscribeToPayments((fetchedPayments) => {
      setPayments(fetchedPayments);
    });
    return () => {
      unsubOrders();
      unsubPayments();
    };
  }, []);

  // Standard Overview Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let totalRevenueYTD = 0;
    let totalRevenueLastYear = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let orderCountThisMonth = 0;
    let orderCountLastMonth = 0;
    
    const uniqueClientsThisMonth = new Set<string>();
    const uniqueClientsLastMonth = new Set<string>();

    orders.forEach(order => {
      let orderDate = now;
      if (order.date) {
        orderDate = new Date(order.date);
      } else if (order.createdAt?.seconds) {
        orderDate = new Date(order.createdAt.seconds * 1000);
      }

      const amountStr = String(order.amount || order.details?.totalAmount || '0').replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr) || 0;
      const client = (order.customer || '').trim().toLowerCase();

      if (orderDate.getFullYear() === currentYear) {
        totalRevenueYTD += amount;
      } else if (orderDate.getFullYear() === currentYear - 1) {
        totalRevenueLastYear += amount;
      }

      if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
        thisMonthRevenue += amount;
        orderCountThisMonth++;
        if (client) uniqueClientsThisMonth.add(client);
      } else if (
        (currentMonth > 0 && orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth - 1) ||
        (currentMonth === 0 && orderDate.getFullYear() === currentYear - 1 && orderDate.getMonth() === 11)
      ) {
        lastMonthRevenue += amount;
        orderCountLastMonth++;
        if (client) uniqueClientsLastMonth.add(client);
      }
    });

    const revenueTrend = totalRevenueLastYear > 0 ? ((totalRevenueYTD - totalRevenueLastYear) / totalRevenueLastYear) * 100 : 0;
    const avgOrderValueThisMonth = orderCountThisMonth > 0 ? thisMonthRevenue / orderCountThisMonth : 0;
    const avgOrderValueLastMonth = orderCountLastMonth > 0 ? lastMonthRevenue / orderCountLastMonth : 0;
    const avgOrderTrend = avgOrderValueLastMonth > 0 ? ((avgOrderValueThisMonth - avgOrderValueLastMonth) / avgOrderValueLastMonth) * 100 : 0;
    const newClientsTrend = uniqueClientsLastMonth.size > 0 ? ((uniqueClientsThisMonth.size - uniqueClientsLastMonth.size) / uniqueClientsLastMonth.size) * 100 : 0;
    
    const formatCurrency = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    return {
      revenueYTD: formatCurrency(totalRevenueYTD),
      revenueTrend,
      avgOrderValue: formatCurrency(avgOrderValueThisMonth),
      avgOrderTrend,
      newClients: uniqueClientsThisMonth.size.toString(),
      newClientsTrend,
      totalOrders: orderCountThisMonth.toString(),
      ordersTrend: orderCountLastMonth > 0 ? ((orderCountThisMonth - orderCountLastMonth) / orderCountLastMonth) * 100 : 0
    };
  }, [orders]);

  // Order map by orderId
  const ordersMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach(o => {
      if (o.id) map.set(o.id, o);
      if (o.docId) map.set(o.docId, o);
    });
    return map;
  }, [orders]);

  // Date range calculation label
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if (period === 'today') {
      return formatDate(now);
    }
    if (period === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    if (period === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'this_fy') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(year, 3, 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
    if (period === 'custom' && (customStartDate || customEndDate)) {
      const startStr = customStartDate ? formatDate(new Date(customStartDate)) : 'Start';
      const endStr = customEndDate ? formatDate(new Date(customEndDate)) : 'Today';
      return `${startStr} to ${endStr}`;
    }
    return 'All Available Time Periods';
  }, [period, customStartDate, customEndDate]);

  // Extract & Filter Received Payment Phases
  const paymentReportData = useMemo(() => {
    const now = new Date();

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'this_week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), qMonth, 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'this_fy') {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      startDate = new Date(fyStartYear, 3, 1);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (customStartDate) {
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const items: Array<{
      orderId: string;
      customer: string;
      phaseTitle: string;
      sourceType: string;
      bankName: string;
      utrNumber: string;
      date: Date | null;
      dateFormatted: string;
      grossAmount: number;
      gstSubtracted: number;
      netCreditedAmount: number;
      isPRorCash: boolean;
      deliveryDate: string;
    }> = [];

    let totalGross = 0;
    let totalGstSub = 0;
    let totalNetCredited = 0;

    let cashTotal = 0;
    let prBankTotal = 0;
    let sbiBankTotal = 0;
    let unionBankTotal = 0;
    let otherBankTotal = 0;
    let chequeTotal = 0;

    const coveredOrderIds = new Set<string>();

    const getAccountCategory = (srcType: string, bnkName: string) => {
      const bnkUpper = (bnkName || '').toUpperCase();
      const srcUpper = (srcType || '').toUpperCase();

      if (srcUpper.includes('ICICI') || srcUpper.includes('CASH') || bnkUpper.includes('ICICI') || bnkUpper.includes('CASH')) {
        return 'ICICI';
      }
      if (bnkUpper.includes('PNB') || bnkUpper.includes('PR') || srcUpper.includes('PNB') || srcUpper.includes('PR')) {
        return 'PNB';
      }
      if (bnkUpper.includes('SBI') || srcUpper.includes('SBI')) {
        return 'SBI';
      }
      if (bnkUpper.includes('UNION') || srcUpper.includes('UNION')) {
        return 'Union';
      }
      if (srcUpper.includes('CHEQUE') || bnkUpper.includes('CHEQUE')) {
        return 'Cheque';
      }
      return 'Other';
    };

    payments.forEach(record => {
      coveredOrderIds.add(record.orderId);
      const order = ordersMap.get(record.orderId);
      const customerName = order?.customer || order?.details?.customerName || 'N/A';
      const orderDeliveryDate = record.deliveryDate || order?.details?.deliveryDate || 'N/A';

      const parseVal = (str: any) => {
        if (!str) return 0;
        const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
        return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
      };
      const baseGrandTotal = parseVal(record.grandTotal || order?.amount);

      (record.phases || []).forEach((phase) => {
        const phaseStatus = String(phase.status || '').trim().toLowerCase();
        if (phaseStatus !== 'received' && phaseStatus !== 'paid' && phaseStatus !== 'completed') return;

        // Parse phase date with flexible format support
        let pDate: Date | null = null;
        if (phase.date) {
          const trimmed = String(phase.date).trim();
          const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (isoMatch) {
            pDate = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
          } else if (dmyMatch) {
            pDate = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
          } else {
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) pDate = parsed;
          }
        }
        if (!pDate && record.updatedAt?.seconds) {
          pDate = new Date(record.updatedAt.seconds * 1000);
        } else if (!pDate && order?.createdAt?.seconds) {
          pDate = new Date(order.createdAt.seconds * 1000);
        } else if (!pDate && order?.date) {
          const parsedOrderDate = new Date(order.date);
          if (!isNaN(parsedOrderDate.getTime())) pDate = parsedOrderDate;
        }

        // Apply date filter
        if (startDate && pDate && pDate < startDate) return;
        if (endDate && pDate && pDate > endDate) return;

        const srcType = phase.sourceType || 'Bank';
        const bnkName = phase.bankName || '';
        const category = getAccountCategory(srcType, bnkName);

        const adj = calculatePhaseGstAdjustment(phase.amount, srcType, bnkName, 18, baseGrandTotal);
        const gross = adj.grossAmount;
        const gstSub = adj.gstAmount;
        const netCredited = adj.netCreditedAmount;

        // Account breakdown totals
        if (category === 'ICICI') cashTotal += netCredited;
        else if (category === 'PNB') prBankTotal += netCredited;
        else if (category === 'SBI') sbiBankTotal += netCredited;
        else if (category === 'Union') unionBankTotal += netCredited;
        else if (category === 'Cheque') chequeTotal += netCredited;
        else otherBankTotal += netCredited;

        // Check active source filter
        let matchesFilter = true;
        if (selectedSource === 'PNB' || selectedSource === 'PR') matchesFilter = (category === 'PNB');
        else if (selectedSource === 'ICICI' || selectedSource === 'Cash') matchesFilter = (category === 'ICICI');
        else if (selectedSource === 'SBI') matchesFilter = (category === 'SBI');
        else if (selectedSource === 'Union') matchesFilter = (category === 'Union');
        else if (selectedSource === 'Cheque') matchesFilter = (category === 'Cheque');

        if (!matchesFilter) return;

        totalGross += gross;
        totalGstSub += gstSub;
        totalNetCredited += netCredited;

        items.push({
          orderId: record.orderId,
          customer: customerName,
          phaseTitle: phase.title || 'Payment Phase',
          sourceType: srcType,
          bankName: bnkName || category,
          utrNumber: phase.utrNumber || 'N/A',
          date: pDate,
          dateFormatted: pDate ? pDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          grossAmount: gross,
          gstSubtracted: gstSub,
          netCreditedAmount: netCredited,
          isPRorCash: adj.isPRorCash,
          deliveryDate: orderDeliveryDate
        });
      });
    });

    // Fallback for orders that don't have an explicit payment record document in payments collection
    orders.forEach(order => {
      const oId = order.id || order.docId;
      if (!oId || coveredOrderIds.has(oId)) return;

      const parseVal = (str: any) => {
        if (!str) return 0;
        const m = str.toString().match(/\d[\d,]*(\.\d+)?/);
        return m ? parseFloat(m[0].replace(/,/g, "")) : 0;
      };

      const advanceAmt = parseVal(order.details?.advancePayment);
      const totalAmt = parseVal(order.amount || order.details?.totalAmount);

      if (advanceAmt > 0 || (order.status && ['completed', 'dispatched', 'received'].includes(order.status.toLowerCase()))) {
        const phaseAmt = advanceAmt > 0 ? advanceAmt : totalAmt;
        if (phaseAmt <= 0) return;

        let pDate: Date | null = null;
        if (order.date) {
          const parsed = new Date(order.date);
          if (!isNaN(parsed.getTime())) pDate = parsed;
        }
        if (!pDate && order.createdAt?.seconds) {
          pDate = new Date(order.createdAt.seconds * 1000);
        }

        if (startDate && pDate && pDate < startDate) return;
        if (endDate && pDate && pDate > endDate) return;

        // Detect bank and source type dynamically from order details
        const bankDetailsStr = String(order.details?.bankDetails || (order as any).bankName || (order as any).sourceType || '');
        let srcType = (order as any).sourceType || 'Bank';
        let bnkName = (order as any).bankName || '';

        const upperDetails = bankDetailsStr.toUpperCase();
        if (upperDetails.includes('ICICI') || upperDetails.includes('CASH')) {
          srcType = 'ICICI BANK';
          bnkName = 'ICICI';
        } else if (upperDetails.includes('SBI')) {
          srcType = 'Bank';
          bnkName = 'SBI';
        } else if (upperDetails.includes('UNION')) {
          srcType = 'Bank';
          bnkName = 'Union';
        } else if (upperDetails.includes('CHEQUE')) {
          srcType = 'Cheque';
          bnkName = 'Cheque';
        } else if (upperDetails.includes('PNB') || upperDetails.includes('PR')) {
          srcType = 'Bank';
          bnkName = 'PNB';
        }

        const category = getAccountCategory(srcType, bnkName);
        const adj = calculatePhaseGstAdjustment(phaseAmt, srcType, bnkName, 18, totalAmt);

        // Account breakdown totals
        if (category === 'ICICI') cashTotal += adj.netCreditedAmount;
        else if (category === 'PNB') prBankTotal += adj.netCreditedAmount;
        else if (category === 'SBI') sbiBankTotal += adj.netCreditedAmount;
        else if (category === 'Union') unionBankTotal += adj.netCreditedAmount;
        else if (category === 'Cheque') chequeTotal += adj.netCreditedAmount;
        else otherBankTotal += adj.netCreditedAmount;

        // Check active source filter
        let matchesFilter = true;
        if (selectedSource === 'PNB' || selectedSource === 'PR') matchesFilter = (category === 'PNB');
        else if (selectedSource === 'ICICI' || selectedSource === 'Cash') matchesFilter = (category === 'ICICI');
        else if (selectedSource === 'SBI') matchesFilter = (category === 'SBI');
        else if (selectedSource === 'Union') matchesFilter = (category === 'Union');
        else if (selectedSource === 'Cheque') matchesFilter = (category === 'Cheque');

        if (!matchesFilter) return;

        totalGross += adj.grossAmount;
        totalGstSub += adj.gstAmount;
        totalNetCredited += adj.netCreditedAmount;

        items.push({
          orderId: oId,
          customer: order.customer || order.details?.customerName || 'N/A',
          phaseTitle: advanceAmt > 0 ? 'Advance Payment' : 'Initial Payment',
          sourceType: srcType,
          bankName: bnkName || category,
          utrNumber: 'N/A',
          date: pDate,
          dateFormatted: pDate ? pDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          grossAmount: adj.grossAmount,
          gstSubtracted: adj.gstAmount,
          netCreditedAmount: adj.netCreditedAmount,
          isPRorCash: adj.isPRorCash,
          deliveryDate: order.details?.deliveryDate || 'N/A'
        });
      }
    });

    // Sort items by date descending
    items.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });

    return {
      items,
      totals: {
        totalGross,
        totalGstSub,
        totalNetCredited,
        cashTotal,
        prBankTotal,
        sbiBankTotal,
        unionBankTotal,
        otherBankTotal,
        chequeTotal,
        transactionCount: items.length
      }
    };
  }, [payments, ordersMap, period, customStartDate, customEndDate, selectedSource]);

  // Helper currency format for UI
  const fmtUI = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  // Helper currency format for PDF (prevents Unicode '₹' symbol rendering bugs in jsPDF)
  const pdfFmt = (n: number) => `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // PDF Report Generator
  const generatePDFReport = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    // Header Banner Box (26mm height)
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 297, 26, 'F');

    // Main Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SRK MODULAR — COMPREHENSIVE PAYMENT REPORT', 12, 12);

    // Subtitle & Filter Info on Line 2 inside header box
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(226, 232, 240);
    const filterLabel = selectedSource === 'ALL' ? 'All Accounts' : `${selectedSource} Bank/Mode`;
    doc.text(`Period: ${dateRangeLabel}    |    Account Filter: ${filterLabel}`, 12, 20);

    // Generation Timestamp on Top Right
    doc.setFontSize(8.5);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 285, 20, { align: 'right' });

    // Summary Section Header
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIVED BREAKDOWN SUMMARY', 12, 33);

    const summaryHead = [
      'Total Net Credited',
      'PNB Bank Account',
      'ICICI Bank Account',
      'SBI Bank Account',
      'Union Bank Account',
      'Cheque / Other',
      'Subtracted GST'
    ];

    const summaryBody = [
      [
        pdfFmt(paymentReportData.totals.totalNetCredited),
        pdfFmt(paymentReportData.totals.prBankTotal),
        pdfFmt(paymentReportData.totals.cashTotal),
        pdfFmt(paymentReportData.totals.sbiBankTotal),
        pdfFmt(paymentReportData.totals.unionBankTotal),
        pdfFmt(paymentReportData.totals.chequeTotal + paymentReportData.totals.otherBankTotal),
        pdfFmt(paymentReportData.totals.totalGstSub)
      ]
    ];

    autoTable(doc, {
      startY: 36,
      margin: { left: 12, right: 12 },
      head: [summaryHead],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      bodyStyles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
      styles: { cellPadding: 2.5, overflow: 'linebreak' }
    });

    const ledgerStartY = (doc as any).lastAutoTable.finalY + 9;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`ITEMIZED TRANSACTIONS LEDGER (${paymentReportData.totals.transactionCount} Received Payments)`, 12, ledgerStartY);

    // Ledger Table
    const tableRows = paymentReportData.items.map((item, index) => [
      index + 1,
      item.dateFormatted,
      item.orderId,
      item.customer,
      item.phaseTitle,
      item.sourceType === 'Bank' ? `Bank (${item.bankName || 'General'})` : item.sourceType,
      item.utrNumber,
      pdfFmt(item.grossAmount),
      item.gstSubtracted > 0 ? `-${pdfFmt(item.gstSubtracted)}` : 'Rs. 0',
      pdfFmt(item.netCreditedAmount)
    ]);

    autoTable(doc, {
      startY: ledgerStartY + 3,
      margin: { left: 12, right: 12 },
      head: [['#', 'Date', 'Order ID', 'Customer Name', 'Phase Title', 'Mode / Bank', 'UTR / Ref No', 'Gross Recd', 'GST Subtracted', 'Net Credited']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'left' },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 50 },
        4: { cellWidth: 26 },
        5: { cellWidth: 26 },
        6: { cellWidth: 26 },
        7: { cellWidth: 25, halign: 'right' },
        8: { cellWidth: 25, halign: 'right' },
        9: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
      },
      foot: [[
        { content: 'TOTAL RECEIVED', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
        pdfFmt(paymentReportData.totals.totalGross),
        `-${pdfFmt(paymentReportData.totals.totalGstSub)}`,
        pdfFmt(paymentReportData.totals.totalNetCredited)
      ]],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8, halign: 'right' }
    });

    const filePeriodName = period.toUpperCase();
    doc.save(`SRK_Payment_Report_${filePeriodName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // CSV / XLSX Export Generator
  const generateXLSXReport = () => {
    const excelRows = paymentReportData.items.map((item, index) => ({
      "S.No": index + 1,
      "Received Date": item.dateFormatted,
      "Order ID": item.orderId,
      "Customer Name": item.customer,
      "Phase Title": item.phaseTitle,
      "Payment Source": item.sourceType,
      "Bank Name": item.bankName || 'N/A',
      "UTR / Cheque Ref": item.utrNumber,
      "Gross Received Amount (INR)": item.grossAmount,
      "GST Subtracted (INR)": item.gstSubtracted,
      "Net Credited Amount (INR)": item.netCreditedAmount,
      "PNB / ICICI GST Exemption": item.isPRorCash ? "Yes" : "No",
      "Order Delivery Date": item.deliveryDate
    }));

    // Add Totals row
    excelRows.push({
      "S.No": "" as any,
      "Received Date": "TOTAL RECEIVED",
      "Order ID": "",
      "Customer Name": "",
      "Phase Title": "",
      "Payment Source": "",
      "Bank Name": "",
      "UTR / Cheque Ref": "",
      "Gross Received Amount (INR)": paymentReportData.totals.totalGross,
      "GST Subtracted (INR)": paymentReportData.totals.totalGstSub,
      "Net Credited Amount (INR)": paymentReportData.totals.totalNetCredited,
      "PNB / ICICI GST Exemption": "",
      "Order Delivery Date": ""
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Report");

    const filePeriodName = period.toUpperCase();
    XLSX.writeFile(workbook, `SRK_Payment_Report_${filePeriodName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Analytics & Financial Reporting
          </h2>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Real-time metric dashboard and bank/cash payment receipts report generator.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue (YTD)" 
          value={stats.revenueYTD} 
          trend={stats.revenueTrend !== 0 ? { value: parseFloat(Math.abs(stats.revenueTrend).toFixed(1)), isPositive: stats.revenueTrend > 0, label: 'vs last year' } : undefined}
          icon={<DollarSign className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        
        <StatCard 
          title="Avg Order Value (This Month)" 
          value={stats.avgOrderValue} 
          trend={stats.avgOrderTrend !== 0 ? { value: parseFloat(Math.abs(stats.avgOrderTrend).toFixed(1)), isPositive: stats.avgOrderTrend > 0, label: 'vs last month' } : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />

        <StatCard 
          title="Active Clients (This Month)" 
          value={stats.newClients} 
          trend={stats.newClientsTrend !== 0 ? { value: parseFloat(Math.abs(stats.newClientsTrend).toFixed(1)), isPositive: stats.newClientsTrend > 0, label: 'vs last month' } : undefined}
          icon={<Users className="w-5 h-5" />}
          colorClass="bg-indigo-50 text-indigo-600"
        />

        <StatCard 
          title="Orders (This Month)" 
          value={stats.totalOrders} 
          trend={stats.ordersTrend !== 0 ? { value: parseFloat(Math.abs(stats.ordersTrend).toFixed(1)), isPositive: stats.ordersTrend > 0, label: 'vs last month' } : undefined}
          icon={<BarChart3 className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* PAYMENT REPORT SECTION */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-slate-900">Payment Receipts & Accounts Report</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Download complete payments received across PNB Bank, ICICI Bank, SBI, Union, and Cheque with time period filters.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generatePDFReport}
              disabled={paymentReportData.items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Download PDF Report
            </button>
            <button
              onClick={generateXLSXReport}
              disabled={paymentReportData.items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <TableIcon className="w-4 h-4" />
              Download Excel (XLSX)
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Time Period Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Time Period:
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as TimePeriod)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_fy">This Financial Year (Apr - Mar)</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {period === 'custom' && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Account / Source Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Source:
            </div>
            {['ALL', 'PNB', 'ICICI', 'SBI', 'Union', 'Cheque'].map((src) => (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  selectedSource === src
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {src === 'ALL' ? 'All Accounts' : src === 'PNB' ? 'PNB Bank' : src === 'ICICI' ? 'ICICI Bank' : src}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Period Display Badge */}
        <div className="text-xs font-bold text-indigo-900 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          Showing Received Payments for: <span className="underline">{dateRangeLabel}</span> ({paymentReportData.totals.transactionCount} transactions)
        </div>

        {/* Account Breakdown Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-indigo-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-indigo-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">Total Net Credited</span>
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {fmtUI(paymentReportData.totals.totalNetCredited)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Actual credited to bank/cash</p>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">PNB Bank Account</span>
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-amber-950">
              {fmtUI(paymentReportData.totals.prBankTotal)}
            </div>
            <p className="text-[11px] text-amber-800/80 font-medium mt-1">Credited to PNB Bank</p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">ICICI Bank Account</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-emerald-950">
              {fmtUI(paymentReportData.totals.cashTotal)}
            </div>
            <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Credited to ICICI Bank</p>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">Other Banks / Cheque</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-blue-950">
              {fmtUI(paymentReportData.totals.sbiBankTotal + paymentReportData.totals.unionBankTotal + paymentReportData.totals.otherBankTotal + paymentReportData.totals.chequeTotal)}
            </div>
            <p className="text-[11px] text-blue-800/80 font-medium mt-1">SBI, Union & Cheques</p>
          </div>
        </div>

        {/* GST Subtraction Exemption Summary Note if applicable */}
        {paymentReportData.totals.totalGstSub > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span>
              <strong>Note on GST Exemption Adjustments:</strong> GST worth <strong>{fmtUI(paymentReportData.totals.totalGstSub)}</strong> was subtracted for PNB Bank and ICICI Bank payments in this period.
            </span>
            <span className="font-extrabold text-amber-950">Total Gross: {fmtUI(paymentReportData.totals.totalGross)}</span>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phase Title</th>
                <th className="py-3 px-4">Source / Mode</th>
                <th className="py-3 px-4">UTR / Ref No</th>
                <th className="py-3 px-4 text-right">Gross Recd</th>
                <th className="py-3 px-4 text-right">GST Subtracted</th>
                <th className="py-3 px-4 text-right">Net Credited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {paymentReportData.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No received payment records found for the selected time period or source filter.
                  </td>
                </tr>
              ) : (
                paymentReportData.items.map((item, idx) => {
                  const isIcici = item.sourceType === 'Cash' || item.sourceType === 'ICICI' || item.sourceType === 'ICICI BANK' || item.bankName === 'ICICI';
                  const isPnb = item.bankName === 'PNB' || item.bankName === 'PR' || item.bankName?.toUpperCase() === 'PNB' || item.bankName?.toUpperCase() === 'PR';
                  const modeLabel = isIcici 
                    ? 'ICICI Bank' 
                    : item.sourceType === 'Bank' 
                    ? `Bank (${item.bankName === 'PR' ? 'PNB' : (item.bankName || 'General')})` 
                    : item.sourceType;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">{item.dateFormatted}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-indigo-600">{item.orderId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{item.customer}</td>
                      <td className="py-3 px-4 font-medium">{item.phaseTitle}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold ${
                          isIcici 
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPnb
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {modeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{item.utrNumber}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">{fmtUI(item.grossAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {item.gstSubtracted > 0 ? `-${fmtUI(item.gstSubtracted)}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{fmtUI(item.netCreditedAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {paymentReportData.items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={6} className="py-3 px-4 uppercase tracking-wider">Total Received</td>
                  <td className="py-3 px-4 text-right">{fmtUI(paymentReportData.totals.totalGross)}</td>
                  <td className="py-3 px-4 text-right text-rose-700">-{fmtUI(paymentReportData.totals.totalGstSub)}</td>
                  <td className="py-3 px-4 text-right text-indigo-900 text-sm">{fmtUI(paymentReportData.totals.totalNetCredited)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
