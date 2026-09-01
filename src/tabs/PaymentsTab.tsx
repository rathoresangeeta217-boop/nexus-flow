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

export function PaymentsTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [activeTab, setActiveTab] = useState<'customer' | 'vendor'>('customer');
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

  const totalReceivables = orders.reduce((sum, order) => {
    const amountStr = order.amount?.toString().replace(/[^0-9.-]+/g, "") || "0";
    return sum + parseFloat(amountStr);
  }, 0);

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

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.id?.toLowerCase().includes(q) || 
      o.docId?.toLowerCase().includes(q) ||
      o.customer?.toLowerCase().includes(q) ||
      o.project?.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'customer' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Users className="w-4 h-4" />
          Customer Receivables
        </button>
        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'vendor' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Building2 className="w-4 h-4" />
          Vendor Payables
        </button>
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white rounded-t-xl border border-slate-200 flex items-center justify-between px-6 py-4">
          <h2 className="font-bold text-slate-800">
            {activeTab === 'customer' ? 'Customer Payment Tracking' : 'Vendor Payment Tracking'}
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
            </button>
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
                    const match = (order.amount || "").toString().match(/\d[\d,]*(\.\d+)?/);
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
                      const advance = parseVal(paymentRecord.advancePayment || paymentRecord.advanceRequirement, grandTotal);
                      const transport = parseVal(paymentRecord.transportationCharges || paymentRecord.loadingCharges, grandTotal);
                      const install = parseVal(paymentRecord.installationCharges, grandTotal);
                      
                      displayTotalAmt = grandTotal + transport + install;

                      let receivedPhasesTotal = 0;
                      if (paymentRecord.phases) {
                        paymentRecord.phases.forEach(phase => {
                          if (phase.status === 'Received') {
                            receivedPhasesTotal += parseVal(phase.amount, grandTotal);
                          }
                        });
                      }
                      calculatedRemaining = displayTotalAmt - receivedPhasesTotal;
                    } else {
                      // no payment record yet, just base order amount
                      calculatedRemaining = orderAmt;
                    }
                    
                    const remainingAmount = Math.max(0, calculatedRemaining);
                    const isFullyPaid = displayTotalAmt > 0 && remainingAmount <= 0;
                    const displayStatus = isFullyPaid ? 'Dispatched' : order.status;

                    return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${order.docId || order.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{order.customer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{displayTotalAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{remainingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" /> Manage Payments
                        </button>
                      </td>
                    </motion.tr>
                  )})}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        No customer orders found to track payments for.
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
                  {aggregatedProjects.map((po, i) => {
                    let totalPaid = 0;
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
                    const remainingAmount = Math.max(0, po.totalAmount - totalPaid);
                    const isFullyPaid = po.totalAmount > 0 && remainingAmount <= 0;
                    const displayStatus = isFullyPaid ? 'Dispatched' : 'Pending';

                    return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${po.projectVendorId}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{po.projectName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{po.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{po.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">₹{remainingAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" /> Manage Vendor Payments
                        </button>
                        <button 
                          onClick={() => setVendorToDelete(po)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <Trash className="w-3.5 h-3.5 mr-1.5" /> Delete
                        </button>
                      </td>
                    </motion.tr>
                  )})}
                  {aggregatedProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                        No purchase orders found.
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
