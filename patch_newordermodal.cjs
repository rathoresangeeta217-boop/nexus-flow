const fs = require('fs');
let content = fs.readFileSync('src/components/NewOrderModal.tsx', 'utf-8');

// 1. Add orderDate to formData initial state
content = content.replace(
  "employeeName: '',",
  "employeeName: '',\n    orderDate: new Date().toISOString().split('T')[0],"
);

// 2. Add orderDate to the reset logic inside useEffect
content = content.replace(
  "employeeName: employeeName || '',",
  "employeeName: employeeName || '',\n        orderDate: new Date().toISOString().split('T')[0],"
);
if (!content.includes("orderDate: new Date().toISOString().split('T')[0],")) {
  // If the above replace didn't work because we matched the wrong string, let's try a different spot
  content = content.replace(
    "employeeName: employeeName || '',\n        customerName: '',",
    "employeeName: employeeName || '',\n        orderDate: new Date().toISOString().split('T')[0],\n        customerName: '',"
  );
}

// 3. Add the input field to the form
const inputField = `
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
                      <input 
                        type="date"
                        name="orderDate"
                        value={formData.orderDate}
                        onChange={handleChange}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
`;

content = content.replace(
  `<h4 className="text-sm font-bold text-slate-800 mb-3">Order Information</h4>`,
  `<h4 className="text-sm font-bold text-slate-800 mb-3">Order Information</h4>` + inputField
);

fs.writeFileSync('src/components/NewOrderModal.tsx', content);
console.log("Patched NewOrderModal.tsx");
