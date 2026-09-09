import React, { useState, useEffect } from 'react';
import { subscribeToQuotes, QuoteRequest } from '../lib/quotes';
import { VendorQuoteForm } from '../components/VendorQuoteForm';
import { Clock, CheckCircle2, Package } from 'lucide-react';
import { Badge } from '../components/Badge';

export function QuotationsTab({ searchQuery = '', setActiveTab }: { searchQuery?: string, setActiveTab?: (tab: any) => void }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  
  useEffect(() => {
    const unsubscribe = subscribeToQuotes(setQuotes);
    return () => unsubscribe();
  }, []);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.vendorId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          quote.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quotations</h2>
          <p className="text-slate-500 mt-1">Manage vendor quotes and RFQs</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab?.('Storefront')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Products
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Quote ID</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No quotations found
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      {quote.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      {quote.createdAt ? new Date(quote.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={quote.status === 'submitted' ? 'success' : 'warning'}
                      >
                        {quote.status === 'submitted' ? 'Submitted' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* Action buttons can be added here if needed */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
