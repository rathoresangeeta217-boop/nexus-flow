const fs = require('fs');
const file = 'src/components/VendorPaymentModal.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Insert addPhase function
content = content.replace(
  '  const handleSave = async () => {',
  `  const addPhase = () => {
    const newPhase = {
      id: \`phase-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
      title: '',
      amount: '',
      status: 'Pending' as const,
      date: ''
    };
    setRecord({ ...record, phases: [...(record.phases || []), newPhase] });
  };

  const removePhase = (index: number) => {
    const updated = [...(record.phases || [])];
    updated.splice(index, 1);
    setRecord({ ...record, phases: updated });
  };

  const handleSave = async () => {`
);

// Replace Payment Phases header with a flex container and Add Phase button
content = content.replace(
  `              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                Payment Phases
              </h3>`,
  `              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  Payment Phases
                </h3>
                <button
                  onClick={addPhase}
                  type="button"
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Phase
                </button>
              </div>`
);

// Add a remove button to each phase
content = content.replace(
  `                    <div className="flex items-center justify-between">`,
  `                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 w-full">`
);

content = content.replace(
  `                      <select
                        value={phase.status}`,
  `                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => removePhase(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Remove Phase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <select
                          value={phase.status}`
);

fs.writeFileSync(file, content);
