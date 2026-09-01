import { useState, useEffect } from 'react';
import { getOrder, saveOrder, Order } from '../lib/orders';
import { Package, Check, X, FileText, Loader2 } from 'lucide-react';

export function AdminApprovalView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const dbOrder = await getOrder(orderId);
        if (dbOrder) {
          setOrder(dbOrder);
        } else {
          setError('Order not found.');
        }
      } catch (err) {
        setError('Error fetching order.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleAction = async (status: 'Approved' | 'Rejected') => {
    if (!order) return;
    setActioning(true);
    try {
      const updatedOrder = {
        ...order,
        details: {
          ...order.details,
          challanApprovalStatus: status
        }
      };
      await saveOrder(updatedOrder);
      setOrder(updatedOrder);
      alert(`Challan creation \${status.toLowerCase()} successfully.`);
    } catch (err) {
      alert('Failed to update status.');
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const currentStatus = order.details?.challanApprovalStatus;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden">
        <div className="px-6 py-8 border-b border-slate-100 bg-slate-900 text-white text-center">
          <div className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Challan Approval Request</h1>
          <p className="text-slate-400">Order ID: {order.id || order.docId}</p>
        </div>
        
        <div className="p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer Details</h3>
              <p className="text-lg font-medium text-slate-900">{order.customer}</p>
              {order.details?.mobileNumber && (
                <p className="text-slate-600">{order.details.mobileNumber}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Reason for Pending Payment Dispatch</h3>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                {order.details?.challanPendingReason || 'No reason provided.'}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Status</h3>
              {currentStatus === 'Approved' ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  <Check className="w-4 h-4 mr-2" /> Approved
                </div>
              ) : currentStatus === 'Rejected' ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  <X className="w-4 h-4 mr-2" /> Rejected
                </div>
              ) : (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Pending Review
                </div>
              )}
            </div>
          </div>

          {currentStatus === 'Pending' && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
              <button
                onClick={() => handleAction('Rejected')}
                disabled={actioning}
                className="flex-1 px-4 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction('Approved')}
                disabled={actioning}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-200"
              >
                Approve Challan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
