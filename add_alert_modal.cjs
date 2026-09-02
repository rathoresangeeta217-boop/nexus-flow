const fs = require('fs');
const file = 'src/components/DispatchView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add state
content = content.replace(
  'const [pendingReason, setPendingReason] = useState("");',
  'const [pendingReason, setPendingReason] = useState("");\n  const [alertMessage, setAlertMessage] = useState<string | null>(null);'
);

// Replace alert in handleChallanClick
content = content.replace(
  "alert('Challan generation is waiting for admin approval. Please check back later.');",
  "setAlertMessage('Challan generation is waiting for admin approval. Please check back later.');"
);

// Replace other alerts if necessary, or just append the modal at the end before final AnimatePresence
content = content.replace(
  '{showPendingReasonPrompt && (',
  `{alertMessage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Notice</h3>
                <p className="text-sm text-slate-600 mb-6">{alertMessage}</p>
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Okay
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showPendingReasonPrompt && (`
);

fs.writeFileSync(file, content);
