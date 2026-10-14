import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { CreditCard, AlertCircle, X } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Trash2, Edit, DollarSign, Receipt, Filter, Users, Building2, Download, Trash } from 'lucide-react';
import { deletePurchase } from '../lib/purchases';
import { getAllVendorPayments, deleteVendorPaymentRecord, subscribeToVendorPayments, VendorPaymentRecord } from '../lib/vendorPayments';
import { subscribeToOrders, Order } from '../lib/orders';
import { subscribeToPurchases, Purchase } from '../lib/purchases';
import { PaymentManagementModal } from '../components/PaymentManagementModal';
import { VendorPaymentModal } from '../components/VendorPaymentModal';
import { ProjectVendorSummaryModal } from '../components/ProjectVendorSummaryModal';
import { getAllPayments, subscribeToPayments, PaymentRecord } from '../lib/payments';

import * as XLSX from 'xlsx';

export type PaymentFilterType = 'all' | 'remaining' | 'unpaid' | 'paid';

export function getOrderPaymentSummary(order: Order, customerPayments: PaymentRecord[]) {
  const rawAmt = (order.amount || order.details?.totalAmount || "").toString();
  const match = rawAmt.match(/\d[\d,]*(\.\d+)?/);
  const orderAmt = match ? parseFloat(match[0].replace(/,/g, "")) : 0;
  const paymentRecord = customerPayments.find(p => p.orderId === order.id || p.orderId === order.docId);

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

  let calculatedRemaining = orderAmt;
  let displayTotalAmt = orderAmt;
  if (paymentRecord) {
    const grandTotal = parseVal(paymentRecord.grandTotal) || orderAmt;
    // Grand Total ALREADY includes transportation, installation, and taxes
    displayTotalAmt = grandTotal;

    let receivedPhasesTotal = 0;
    if (paymentRecord.phases) {
      paymentRecord.phases.forEach(phase => {
        if (phase.status === 'Received') {
          receivedPhasesTotal += parseVal(phase.amount, grandTotal);
        }
      });
    }
    calculatedRemaining = displayTotalAmt - receivedPhasesTotal;
  }

  const remainingAmount = Math.max(0, calculatedRemaining);
  const isFullyPaid = displayTotalAmt > 0 && remainingAmount <= 0.01;
  const hasRemaining = displayTotalAmt > 0 && remainingAmount > 0.01;
  const isUnpaid = displayTotalAmt > 0 && Math.abs(remainingAmount - displayTotalAmt) < 0.01;

  return {
    orderAmt,
    displayTotalAmt,
    remainingAmount,
    isFullyPaid,
    hasRemaining,
    isUnpaid,
    paymentRecord
  };
}

export function getVendorPoPaymentSummary(po: any, vendorPayments: VendorPaymentRecord[]) {
  let totalPaid = 0;
  if (po.pos) {
    po.pos.forEach((subPo: any) => {
      const record = vendorPayments.find(p => p.poNumber === subPo.poNumber);
      if (record?.phases) {
        record.phases.forEach(phase => {
          if (phase.status === 'Paid') {
            let phaseAmt = 0;
            const strVal = (phase.amount || "").toString();
            const pctMatch = strVal.match(/(\d[\d,]*(\.\d+)?)\s*%/);
            if (pctMatch && po.totalAmount > 0) {
              const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
              phaseAmt = (pct / 100) * po.totalAmount;
            } else {
              const amtMatch = strVal.match(/\d[\d,]*(\.\d+)?/);
              phaseAmt = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, "")) || 0 : 0;
            }
            totalPaid += phaseAmt;
          }
        });
      }
    });
  }
  const remainingAmount = Math.max(0, (po.totalAmount || 0) - totalPaid);
  const isFullyPaid = (po.totalAmount || 0) > 0 && remainingAmount <= 0.01;
  const hasRemaining = (po.totalAmount || 0) > 0 && remainingAmount > 0.01;
  const isUnpaid = (po.totalAmount || 0) > 0 && totalPaid === 0;

  return {
    totalPaid,
    remainingAmount,
    isFullyPaid,
    hasRemaining,
    isUnpaid
  };
}

export function PaymentsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  const [customerPayments, setCustomerPayments] = useState<PaymentRecord[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPaymentRecord[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubOrders = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    const unsubPurchases = subscribeToPurchases((fetchedPurchases) => {
      setPurchases(fetchedPurchases);
    });
    const unsubCustPayments = subscribeToPayments((fetched) => {
      setCustomerPayments(fetched);
    });
    const unsubVendPayments = subscribeToVendorPayments((fetched) => {
      setVendorPayments(fetched);
    });
    return () => {
      unsubOrders();
      unsubPurchases();
      unsubCustPayments();
      unsubVendPayments();
    };
  }, []);

  const aggregatedProjects = useMemo(() => {
    const projectGroups: Record<string, any> = {};
    
    purchases.forEach(p => {
      const projectId = p.details?.projectId || 'unassigned';
      const projectName = p.details?.projectName || 'Unassigned Project';
      const vendorName = p.vendorName || p.details?.vendorName || 'Unknown Vendor';
      const poNumber = p.details?.poNumber;
      if (!poNumber) return;
      
      const groupKey = `${projectId}_${vendorName}`;
      
      if (!projectGroups[groupKey]) {
        projectGroups[groupKey] = {
          projectVendorId: groupKey,
          projectId,
          projectName,
          vendorName,
          subTotal: 0,
          totalAmount: 0,
          poMap: {}
        };
      }
      
      const projGroup = projectGroups[groupKey];
      if (!projGroup.poMap[poNumber]) {
        projGroup.poMap[poNumber] = {
          poNumber,
          vendorName,
          subTotal: 0,
          totalAmount: 0
        };
      }

      const priceStr = (p.price || p.details?.perUnitPrice || p.details?.totalUnitPrice || "0").toString();
      const numericPrice = parseFloat(priceStr.match(/\d[\d,.]*/)?.[0].replace(/,/g, '') || "0");
      const quantity = parseFloat(p.details?.quantity || "1");
      const itemTotal = numericPrice * quantity;

      projGroup.subTotal += itemTotal;
      projGroup.poMap[poNumber].subTotal += itemTotal;
    });
    
    return Object.values(projectGroups).map((group: any) => {
      const groupGst = group.subTotal * 0.18;
      group.totalAmount = group.subTotal + groupGst;
      
      // Convert poMap to array and add GST
      group.pos = Object.values(group.poMap).map((po: any) => {
        const poGst = po.subTotal * 0.18;
        po.totalAmount = po.subTotal + poGst;
        return po;
      });
      delete group.poMap;

      return group;
    }).filter(group => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        group.projectName?.toLowerCase().includes(q) ||
        group.vendorName?.toLowerCase().includes(q) ||
        group.pos.some((po: any) => po.poNumber?.toLowerCase().includes(q))
      );
    });
  }, [purchases, searchQuery]);

  // Overall metrics and counts for Customer orders
  const customerMetrics = useMemo(() => {
    let totalReceivables = 0;
    let totalRemaining = 0;
    let totalCollected = 0;
    let remainingCount = 0;
    let unpaidCount = 0;
    let fullyPaidCount = 0;

    orders.forEach(order => {
      const summary = getOrderPaymentSummary(order, customerPayments);
      totalReceivables += summary.displayTotalAmt;
      totalRemaining += summary.remainingAmount;
      totalCollected += Math.max(0, summary.displayTotalAmt - summary.remainingAmount);

      if (summary.hasRemaining) remainingCount++;
      if (summary.isUnpaid) unpaidCount++;
      if (summary.isFullyPaid) fullyPaidCount++;
    });

    return {
      totalReceivables,
      totalRemaining,
      totalCollected,
      remainingCount,
      unpaidCount,
      fullyPaidCount,
      totalCount: orders.length
    };
  }, [orders, customerPayments]);

  // Overall metrics and counts for Vendor projects
  const vendorMetrics = useMemo(() => {
    let totalPayables = 0;
    let totalRemaining = 0;
    let totalDisbursed = 0;
    let remainingCount = 0;
    let unpaidCount = 0;
    let fullyPaidCount = 0;

    aggregatedProjects.forEach(po => {
      const summary = getVendorPoPaymentSummary(po, vendorPayments);
      totalPayables += po.totalAmount || 0;
      totalRemaining += summary.remainingAmount;
      totalDisbursed += summary.totalPaid;

      if (summary.hasRemaining) remainingCount++;
      if (summary.isUnpaid) unpaidCount++;
      if (summary.isFullyPaid) fullyPaidCount++;
    });

    return {
      totalPayables,
      totalRemaining,
      totalDisbursed,
      remainingCount,
      unpaidCount,
      fullyPaidCount,
      totalCount: aggregatedProjects.length
    };
  }, [aggregatedProjects, vendorPayments]);

  // Filtered Customer Orders based on search and paymentFilter
  const filteredOrders = useMemo(() => {
    let result = orders;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.id?.toLowerCase().includes(q) || 
        o.docId?.toLowerCase().includes(q) ||
        o.customer?.toLowerCase().includes(q) ||
        o.project?.toLowerCase().includes(q)
      );
    }
    
    if (paymentFilter === 'remaining') {
      result = result.filter(order => {
        const summary = getOrderPaymentSummary(order, customerPayments);
        return summary.hasRemaining;
      });
    } else if (paymentFilter === 'unpaid') {
      result = result.filter(order => {
        const summary = getOrderPaymentSummary(order, customerPayments);
        return summary.isUnpaid;
      });
    } else if (paymentFilter === 'paid') {
      result = result.filter(order => {
        const summary = getOrderPaymentSummary(order, customerPayments);
        return summary.isFullyPaid;
      });
    }

    return result;
  }, [orders, searchQuery, customerPayments, paymentFilter]);

  // Filtered Vendor Projects based on search and paymentFilter
  const filteredAggregatedProjects = useMemo(() => {
    let result = aggregatedProjects;

    if (paymentFilter === 'remaining') {
      result = result.filter(po => {
        const summary = getVendorPoPaymentSummary(po, vendorPayments);
        return summary.hasRemaining;
      });
    } else if (paymentFilter === 'unpaid') {
      result = result.filter(po => {
        const summary = getVendorPoPaymentSummary(po, vendorPayments);
        return summary.isUnpaid;
      });
    } else if (paymentFilter === 'paid') {
      result = result.filter(po => {
        const summary = getVendorPoPaymentSummary(po, vendorPayments);
        return summary.isFullyPaid;
      });
    }

    return result;
  }, [aggregatedProjects, paymentFilter, vendorPayments]);

  const totalPayables = aggregatedProjects.reduce((sum, po) => sum + po.totalAmount, 0);

  const confirmDeleteProjectVendor = async () => {
    if (deletePassword !== '9785') {
      // Create a temporary notification element since alert is blocked
      const msg = document.createElement('div');
      msg.textContent = 'Incorrect password.';
      msg.style.position = 'fixed';
      msg.style.top = '20px';
      msg.style.right = '20px';
      msg.style.backgroundColor = '#ef4444';
      msg.style.color = 'white';
      msg.style.padding = '12px 24px';
      msg.style.borderRadius = '8px';
      msg.style.zIndex = '9999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
      return;
    }

    if (!vendorToDelete) return;
    setIsDeleting(true);

    const projectId = vendorToDelete.projectId;
    const vendorName = vendorToDelete.vendorName;
    
    // Find all purchases matching this and delete them
    const purchasesToDelete = purchases.filter(p => {
      const pProjectId = p.details?.projectId || 'unassigned';
      const pVendorName = p.vendorName || p.details?.vendorName || 'Unknown Vendor';
      return pProjectId === projectId && pVendorName === vendorName;
    });

    try {
      // Delete all purchases
      for (const p of purchasesToDelete) {
        if (p.docId) {
          await deletePurchase(p.docId);
        } else if ((p as any).id) {
           await deletePurchase((p as any).id);
        }
      }
      
      // Also delete any vendor payment records for these POs
      const uniquePOs = Array.from(new Set(purchasesToDelete.map(p => p.details?.poNumber).filter(Boolean)));
      const allVendorPayments = await getAllVendorPayments();
      
      for (const poNumber of uniquePOs) {
        const record = allVendorPayments.find(vp => vp.poNumber === poNumber);
        if (record && record.docId) {
           await deleteVendorPaymentRecord(record.docId);
        }
      }
      
      const msg = document.createElement('div');
      msg.textContent = 'Successfully deleted project vendor records.';
      msg.style.position = 'fixed';
      msg.style.top = '20px';
      msg.style.right = '20px';
      msg.style.backgroundColor = '#10b981';
      msg.style.color = 'white';
      msg.style.padding = '12px 24px';
      msg.style.borderRadius = '8px';
      msg.style.zIndex = '9999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);

      setVendorToDelete(null);
      setDeletePassword('');
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
      msg.style.zIndex = '9999';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadDetailedReport = async () => {
    try {
      setIsDownloading(true);
      const wb = XLSX.utils.book_new();

      if (activeTab === 'customer') {
        const allPayments = await getAllPayments();
        const paymentsData: any[] = [];
        const historyData: any[] = [];
        
        orders.forEach(order => {
          const paymentRecord = allPayments.find(p => p.orderId === order.id);
          if (paymentRecord && paymentRecord.phases && paymentRecord.phases.length > 0) {
            paymentRecord.phases.forEach((phase, index) => {
              paymentsData.push({
                "Order ID": order.id,
                "Customer": order.customer,
                "Total Amount": order.amount,
                "Phase Title": phase.title || `Phase ${index + 1}`,
                "Phase Amount": phase.amount || '',
                "Status": phase.status || '',
                "Source": phase.sourceType || '',
                "Bank": phase.bankName || '',
                "Reference": phase.utrNumber || '',
                "Date": phase.date || ''
              });
            });
          }
          if (paymentRecord && paymentRecord.history && paymentRecord.history.length > 0) {
            paymentRecord.history.forEach((h: any) => {
              historyData.push({
                "Order ID": order.id,
                "Date": h.timestamp,
                "Reason": h.reason,
                "Changes": h.changes.join(" | ")
              });
            });
          }
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), "Customer Payments");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData.length > 0 ? historyData : [{"Note": "No rate modifications found."}]), "Rate History");
      } else {
        const allVendorPayments = await getAllVendorPayments();
        const vpData: any[] = [];
        
        aggregatedProjects.forEach(projVendor => {
          projVendor.pos.forEach((po: any) => {
            const record = allVendorPayments.find(p => p.poNumber === po.poNumber);
            if (record && record.phases && record.phases.length > 0) {
              record.phases.forEach((phase, index) => {
                vpData.push({
                  "Project": projVendor.projectName,
                  "PO Number": po.poNumber,
                  "Vendor": po.vendorName,
                  "Total Amount": po.totalAmount,
                  "Phase Title": phase.title || `Phase ${index + 1}`,
                  "Phase Amount": phase.amount || '',
                  "Status": phase.status || '',
                  "Source": phase.sourceType || '',
                  "Bank": phase.bankName || '',
                  "Reference": phase.utrNumber || '',
                  "Date": phase.date || ''
                });
              });
            }
          });
        });

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vpData), "Vendor Payments");
      }
          
      XLSX.writeFile(wb, `${activeTab === 'customer' ? 'Customer' : 'Vendor'}_Payment_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      
      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Financial Overview</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage customer payments and vendor purchase orders.</p>
        </div>
        
        <button 
          onClick={handleDownloadDetailedReport}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Downloading...' : 'Detailed Report'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'customer' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Users className="w-4 h-4" />
            Customer Receivables
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
              {customerMetrics.totalCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('vendor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${activeTab === 'vendor' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Building2 className="w-4 h-4" />
            Vendor Payables
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
              {vendorMetrics.totalCount}
            </span>
          </button>
        </div>

        {/* Active Filter Indicator Badge */}
        {paymentFilter !== 'all' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span>Filter Active: <strong>{paymentFilter === 'remaining' ? 'Orders with Remaining Amount' : paymentFilter === 'unpaid' ? 'Unpaid Orders Only' : 'Fully Paid Orders'}</strong></span>
            <button
              onClick={() => setPaymentFilter('all')}
              className="text-amber-700 hover:text-amber-900 p-0.5 hover:bg-amber-100 rounded transition-colors cursor-pointer"
              title="Clear Filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'customer' ? (
          <>
            <StatCard 
              title="Total Receivables"
              value={`₹${customerMetrics.totalReceivables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
              colorClass="bg-indigo-50 text-indigo-600"
            />
            <div 
              onClick={() => setPaymentFilter(paymentFilter === 'remaining' ? 'all' : 'remaining')}
              className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              title="Click to filter orders with remaining amount"
            >
              <div className={`p-4 rounded-xl border transition-all ${paymentFilter === 'remaining' ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'}`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Remaining Amount
                  </p>
                  <div className="opacity-80 p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600">
                  ₹{customerMetrics.totalRemaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <div className="mt-2 text-xs flex items-center justify-between text-slate-500 font-medium">
                  <span className="text-amber-700 font-bold">{customerMetrics.remainingCount} Orders with balance</span>
                  <span className="text-[11px] underline text-indigo-600 font-bold">
                    {paymentFilter === 'remaining' ? 'Showing filtered' : 'Click to filter'}
                  </span>
                </div>
              </div>
            </div>
            <StatCard 
              title="Payments Collected"
              value={`₹${customerMetrics.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Settled Orders"
              value={`${customerMetrics.fullyPaidCount} / ${customerMetrics.totalCount}`}
              icon={<Receipt className="w-5 h-5 text-sky-600" />}
              colorClass="bg-sky-50 text-sky-600"
            />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Payables"
              value={`₹${vendorMetrics.totalPayables.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<DollarSign className="w-5 h-5 text-blue-600" />}
              colorClass="bg-blue-50 text-blue-600"
            />
            <div 
              onClick={() => setPaymentFilter(paymentFilter === 'remaining' ? 'all' : 'remaining')}
              className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              title="Click to filter purchase orders with remaining amount"
            >
              <div className={`p-4 rounded-xl border transition-all ${paymentFilter === 'remaining' ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-400/30' : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'}`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Remaining Payables
                  </p>
                  <div className="opacity-80 p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600">
                  ₹{vendorMetrics.totalRemaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <div className="mt-2 text-xs flex items-center justify-between text-slate-500 font-medium">
                  <span className="text-amber-700 font-bold">{vendorMetrics.remainingCount} POs with balance</span>
                  <span className="text-[11px] underline text-blue-600 font-bold">
                    {paymentFilter === 'remaining' ? 'Showing filtered' : 'Click to filter'}
                  </span>
                </div>
              </div>
            </div>
            <StatCard 
              title="Disbursed to Vendors"
              value={`₹${vendorMetrics.totalDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Settled Vendor POs"
              value={`${vendorMetrics.fullyPaidCount} / ${vendorMetrics.totalCount}`}
              icon={<Receipt className="w-5 h-5 text-sky-600" />}
              colorClass="bg-sky-50 text-sky-600"
            />
          </>
        )}
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white rounded-t-xl border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 sm:px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800 text-base">
              {activeTab === 'customer' ? 'Customer Payment Tracking' : 'Vendor Payment Tracking'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {activeTab === 'customer' ? `${filteredOrders.length} Orders` : `${filteredAggregatedProjects.length} Projects`}
            </span>
          </div>

          {/* Filter Bar with Quick Pills and Select Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Segmented Filter Pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setPaymentFilter('all')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  paymentFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({activeTab === 'customer' ? customerMetrics.totalCount : vendorMetrics.totalCount})
              </button>
              
              {/* PRIMARY USER FILTER: Orders with Remaining Amount */}
              <button
                type="button"
                onClick={() => setPaymentFilter('remaining')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  paymentFilter === 'remaining' 
                    ? 'bg-amber-500 text-white shadow-xs font-bold' 
                    : 'text-slate-700 hover:text-amber-800 hover:bg-amber-50/60'
                }`}
              >
                <span>Remaining Amount</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  paymentFilter === 'remaining' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {activeTab === 'customer' ? customerMetrics.remainingCount : vendorMetrics.remainingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentFilter('unpaid')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  paymentFilter === 'unpaid' 
                    ? 'bg-rose-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unpaid ({activeTab === 'customer' ? customerMetrics.unpaidCount : vendorMetrics.unpaidCount})
              </button>

              <button
                type="button"
                onClick={() => setPaymentFilter('paid')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  paymentFilter === 'paid' 
                    ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fully Paid ({activeTab === 'customer' ? customerMetrics.fullyPaidCount : vendorMetrics.fullyPaidCount})
              </button>
            </div>

            {/* Select Dropdown Filter */}
            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentFilterType)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Orders</option>
                <option value="remaining">Orders with Remaining Amount</option>
                <option value="unpaid">Unpaid Orders Only</option>
                <option value="paid">Fully Paid Orders</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 bg-white border-x border-b border-slate-200 overflow-hidden rounded-b-xl">
          <div className="overflow-x-auto">
            {activeTab === 'customer' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Order Ref</th>
                    <th className="px-6 py-3 border-b border-slate-200">Customer</th>
                    <th className="px-6 py-3 border-b border-slate-200">Total Amount</th>
                    <th className="px-6 py-3 border-b border-slate-200">Remaining Amount</th>
                    <th className="px-6 py-3 border-b border-slate-200">Order Date</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Payment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order, i) => {
                    const summary = getOrderPaymentSummary(order, customerPayments);
                    const displayStatus = summary.isFullyPaid ? 'Dispatched' : order.status;

                    return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + i * 0.02 }}
                      key={`${order.docId || order.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{summary.displayTotalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.remainingAmount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-600">
                              ₹{summary.remainingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                              Pending
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-600">₹0.00</span>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              Settled
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{order.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={displayStatus === 'Dispatched' ? 'success' : (displayStatus === 'Completed' ? 'success' : 'default')}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" /> Manage Payments
                        </button>
                      </td>
                    </motion.tr>
                  )})}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-400" />
                          <p className="font-semibold text-slate-700">
                            No orders found matching the {paymentFilter === 'remaining' ? 'Remaining Amount' : paymentFilter === 'unpaid' ? 'Unpaid' : paymentFilter === 'paid' ? 'Fully Paid' : ''} filter.
                          </p>
                          {paymentFilter !== 'all' && (
                            <button
                              onClick={() => setPaymentFilter('all')}
                              className="mt-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Reset to All Orders
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Project</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor</th>
                    <th className="px-6 py-3 border-b border-slate-200">Project Total Amount</th>
                    <th className="px-6 py-3 border-b border-slate-200">Remaining Amount</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Payment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAggregatedProjects.map((po, i) => {
                    const summary = getVendorPoPaymentSummary(po, vendorPayments);
                    const displayStatus = summary.isFullyPaid ? 'Dispatched' : 'Pending';

                    return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + i * 0.02 }}
                      key={`${po.projectVendorId}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{po.projectName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{po.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {summary.remainingAmount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-600">
                              ₹{summary.remainingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                              Pending
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-600">₹0.00</span>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              Settled
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={displayStatus === 'Dispatched' ? 'success' : 'default'}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedPO(po);
                            setIsVendorModalOpen(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" /> Manage Vendor Payments
                        </button>
                        <button 
                          onClick={() => setVendorToDelete(po)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </button>
                      </td>
                    </motion.tr>
                  )})}
                  {filteredAggregatedProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-400" />
                          <p className="font-semibold text-slate-700">
                            No vendor purchase orders found matching the {paymentFilter === 'remaining' ? 'Remaining Amount' : paymentFilter === 'unpaid' ? 'Unpaid' : paymentFilter === 'paid' ? 'Fully Paid' : ''} filter.
                          </p>
                          {paymentFilter !== 'all' && (
                            <button
                              onClick={() => setPaymentFilter('all')}
                              className="mt-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Reset to All Projects
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {vendorToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Confirm Deletion</h3>
              <button onClick={() => { setVendorToDelete(null); setDeletePassword(''); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to delete all purchases and payment records for <strong>{vendorToDelete.projectName} - {vendorToDelete.vendorName}</strong>? This action cannot be undone.
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
                  onClick={() => { setVendorToDelete(null); setDeletePassword(''); }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProjectVendor}
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Records'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isModalOpen && selectedOrder && (
        <PaymentManagementModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}
      
      {isVendorModalOpen && selectedPO && (
        <ProjectVendorSummaryModal 
          isOpen={isVendorModalOpen}
          onClose={() => {
            setIsVendorModalOpen(false);
            setSelectedPO(null);
          }}
          projectVendor={selectedPO}
        />
      )}
    </div>
  );
}
