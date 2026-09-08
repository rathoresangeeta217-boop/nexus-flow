const fs = require('fs');

const tabs = [
  'src/tabs/OrdersTab.tsx',
  'src/tabs/PurchaseTab.tsx',
  'src/tabs/ProductionTab.tsx',
  'src/tabs/InstallationTab.tsx',
  'src/tabs/DispatchedTab.tsx',
  'src/tabs/PaymentsTab.tsx'
];

for (const tab of tabs) {
  if (!fs.existsSync(tab)) continue;
  let content = fs.readFileSync(tab, 'utf8');

  // Change action bar layout
  const actionBarOld = `flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`;
  const actionBarNew = `flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4`;
  if (content.includes(actionBarOld)) content = content.replace(actionBarOld, actionBarNew);

  // Change table header wrapping
  const tableHeaderOld = `bg-white rounded-t-xl border border-slate-200 flex items-center justify-between px-6 py-4`;
  const tableHeaderNew = `bg-white rounded-t-xl border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 sm:px-6 py-4 gap-4`;
  
  // also catch the one without px-6
  const tableHeaderOld2 = `bg-white rounded-t-xl border border-slate-200 flex items-center justify-between p-4 sm:p-6`;
  
  if (content.includes(tableHeaderOld)) content = content.replace(tableHeaderOld, tableHeaderNew);
  if (content.includes(tableHeaderOld2)) content = content.replace(tableHeaderOld2, tableHeaderNew);

  // Filters inner wrap
  const filterOld = `className="flex gap-2 items-center"`;
  const filterNew = `className="flex flex-wrap gap-2 items-center w-full lg:w-auto"`;
  
  if (content.includes(filterOld)) content = content.replace(filterOld, filterNew);
  
  const filterOld2 = `<div className="flex gap-3 items-center">`;
  const filterNew2 = `<div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">`;
  if (content.includes(filterOld2)) content = content.replace(filterOld2, filterNew2);

  fs.writeFileSync(tab, content);
}
console.log("Patched tab responsive layouts.");
