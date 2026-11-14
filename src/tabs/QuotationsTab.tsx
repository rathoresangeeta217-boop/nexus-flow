import React, { useState, useEffect } from 'react';
import {
  Package,
  FileText,
  Download,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Building,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '../components/Badge';
import { CreateQuotationModal } from '../components/CreateQuotationModal';
import { subscribeToProducts, Product } from '../lib/products';
import {
  subscribeToQuotations,
  SavedQuotation,
  QuotationStatus,
  updateQuotation,
  deleteQuotation
} from '../lib/quotations';
import { generateQuotationPDF, QuotationData } from '../lib/pdfHelper';

export function QuotationsTab({
  searchQuery = '',
  setActiveTab
}: {
  searchQuery?: string;
  setActiveTab?: (tab: any) => void;
}) {
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [isCreateQuotationModalOpen, setIsCreateQuotationModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<SavedQuotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotationToDelete, setQuotationToDelete] = useState<SavedQuotation | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToProducts(setProducts);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToQuotations(setQuotations);
    return () => unsubscribe();
  }, []);

  const filteredQuotations = quotations.filter((q) => {
    const sq = searchQuery.trim().toLowerCase();
    if (!sq) return true;
    return (
      (q.quotationNo || '').toLowerCase().includes(sq) ||
      (q.buyerName || '').toLowerCase().includes(sq) ||
      (q.companyName || '').toLowerCase().includes(sq) ||
      (q.mobileNumber || '').toLowerCase().includes(sq) ||
      (q.email || '').toLowerCase().includes(sq) ||
      (q.gstNumber || '').toLowerCase().includes(sq) ||
      (q.items || []).some(
        (it) =>
          (it.productName || '').toLowerCase().includes(sq) ||
          (it.category || '').toLowerCase().includes(sq)
      )
    );
  });

  const handleDownloadSavedPDF = async (q: SavedQuotation) => {
    setDownloadingId(q.id);
    try {
      const pdfData: QuotationData = {
        quotationNo: q.quotationNo,
        quotationDate: q.quotationDate
          ? new Date(q.quotationDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : new Date().toLocaleDateString('en-GB'),
        validTillDate: q.validTillDate
          ? new Date(q.validTillDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : '',
        customerName: q.buyerName,
        companyName: q.companyName || '',
        gstNumber: q.gstNumber || '',
        customerAddress: q.address || '',
        customerMobile: q.mobileNumber,
        customerEmail: q.email || '',
        items: (q.items || []).map((it) => {
          const matchedProduct = products.find(
            (p) => p.id === it.productId || p.docId === it.productId
          );
          return {
            product: matchedProduct || { name: it.productName, category: it.category },
            selectedOptionsSummary: `[${it.category}] ${it.defaultSpecs || ''}`.trim(),
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            discountPct: it.discountPct || 0,
            amount: it.amount
          };
        }),
        subtotal: q.subtotal || 0,
        discountTotal: q.discountTotal || 0,
        gstRate: typeof q.gstRate === 'number' ? q.gstRate : 18,
        gstAmount: q.gstAmount || 0,
        grandTotal: q.grandTotal || 0,
        notes: q.notes,
        paymentTerms: q.paymentTerms
      };
      await generateQuotationPDF(pdfData);
    } catch (error) {
      console.error('Failed to regenerate quotation PDF:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (q: SavedQuotation, nextStatus: QuotationStatus) => {
    try {
      await updateQuotation(q.docId || q.id, { status: nextStatus });
    } catch (error) {
      console.error('Failed to update quotation status:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!quotationToDelete) return;
    try {
      await deleteQuotation(quotationToDelete.docId || quotationToDelete.id);
      setQuotationToDelete(null);
    } catch (error) {
      console.error('Failed to delete quotation:', error);
    }
  };

  const totalQuotedValue = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
  const approvedCount = quotations.filter(
    (q) => q.status === 'approved' || q.status === 'converted'
  ).length;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quotations</h2>
          <p className="text-slate-500 mt-1">
            Create commercial quotations and view all saved buyer quotations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingQuotation(null);
              setIsCreateQuotationModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Create Quotation
          </button>
          <button
            onClick={() => setActiveTab?.('Storefront')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            Products
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Quotations
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{quotations.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Quoted Value
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono">
            ₹{totalQuotedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Approved / Converted
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Quotation No & Date</th>
                <th className="px-5 py-3.5 font-semibold">Buyer Details</th>
                <th className="px-5 py-3.5 font-semibold">Products & Categories</th>
                <th className="px-5 py-3.5 font-semibold">Grand Total</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {quotations.length === 0
                      ? 'No quotations created yet. Click "Create Quotation" to create your first quotation.'
                      : `No quotations found matching "${searchQuery}".`}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const uniqueCategories = Array.from(
                    new Set((q.items || []).map((i) => i.category).filter(Boolean))
                  );
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-indigo-600 font-mono">{q.quotationNo}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{q.quotationDate || 'N/A'}</div>
                        {q.validTillDate && (
                          <div className="text-[11px] text-slate-400">
                            Valid till {q.validTillDate}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{q.buyerName}</div>
                        {q.companyName && (
                          <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{q.companyName}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{q.mobileNumber}</span>
                        </div>
                        {q.email && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{q.email}</span>
                          </div>
                        )}
                        {q.gstNumber && (
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            GST: {q.gstNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {uniqueCategories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-700 font-medium">
                          {(q.items || []).length} {(q.items || []).length === 1 ? 'item' : 'items'}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 max-w-xs">
                          {(q.items || [])
                            .map((i) => `${i.productName} (×${i.quantity})`)
                            .join(', ')}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono">
                          ₹
                          {Number(q.grandTotal || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500">Incl. {q.gstRate ?? 18}% GST</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <Badge
                            variant={
                              q.status === 'approved' || q.status === 'converted'
                                ? 'success'
                                : q.status === 'sent'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {q.status === 'approved'
                              ? 'Approved'
                              : q.status === 'converted'
                              ? 'Converted'
                              : q.status === 'sent'
                              ? 'Sent'
                              : 'Draft'}
                          </Badge>
                          <select
                            value={q.status}
                            onChange={(e) =>
                              handleStatusChange(q, e.target.value as QuotationStatus)
                            }
                            className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 cursor-pointer"
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="approved">Approved</option>
                            <option value="converted">Converted</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSavedPDF(q)}
                            disabled={downloadingId === q.id}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Download A4 Commercial Quotation PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuotation(q);
                              setIsCreateQuotationModalOpen(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Quotation"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuotationToDelete(q)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Quotation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Quotation Modal */}
      <CreateQuotationModal
        isOpen={isCreateQuotationModalOpen}
        onClose={() => {
          setIsCreateQuotationModalOpen(false);
          setEditingQuotation(null);
        }}
        allProducts={products}
        editingQuotation={editingQuotation}
      />

      {/* Delete Confirmation Modal */}
      {quotationToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Quotation?</h3>
                <p className="text-xs text-slate-500">
                  Remove {quotationToDelete.quotationNo} for {quotationToDelete.buyerName}?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuotationToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Delete Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
