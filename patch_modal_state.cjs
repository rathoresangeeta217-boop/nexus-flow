const fs = require('fs');
let content = fs.readFileSync('src/components/OrderDetailsModal.tsx', 'utf-8');

const stateHook = `  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState('');

  useEffect(() => {
    if (order?.date) {
      // Try to parse the date back into YYYY-MM-DD
      try {
        const parsed = new Date(order.date);
        if (!isNaN(parsed.getTime())) {
          setEditedDate(parsed.toISOString().split('T')[0]);
        }
      } catch (e) {}
    }
  }, [order]);

  const handleSaveDate = async () => {
    if (!order?.docId) return;
    try {
      const formattedDate = new Date(editedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await saveOrder({
        docId: order.docId,
        date: formattedDate
      });
      setIsEditingDate(false);
      // Optimistically update order date
      order.date = formattedDate;
    } catch(err) {
      console.error(err);
    }
  };
`;

content = content.replace("  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);", stateHook);

const dateDisplay = `                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Order Receiving Date</p>
                      <div className="flex items-center gap-2">
                        {isEditingDate ? (
                          <>
                            <input 
                              type="date" 
                              value={editedDate}
                              onChange={(e) => setEditedDate(e.target.value)}
                              className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={handleSaveDate} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingDate(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-800">{order.date || 'N/A'}</p>
                            <button onClick={() => setIsEditingDate(true)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>`;

content = content.replace(
`                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Order Receiving Date</p>
                      <p className="text-sm font-semibold text-slate-800">{order.date || 'N/A'}</p>
                    </div>
                  </div>`, dateDisplay);


fs.writeFileSync('src/components/OrderDetailsModal.tsx', content);
console.log("Patched order modal state");
