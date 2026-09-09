const fs = require('fs');
let content = fs.readFileSync('src/tabs/DispatchedTab.tsx', 'utf8');

const targetScheduled = `const scheduledStatuses = ['Scheduled Dispatched', 'Shipped', 'Out for Delivery', 'Dispatched', 'Installation Pending', 'Installation In Progress'];`;
const newScheduled = `const scheduledStatuses = ['Scheduled Dispatched', 'Shipped', 'Out for Delivery', 'Installation Pending', 'Installation In Progress'];`;

const targetHistory = `const historyStatuses = ['Delivered', 'Completed', 'Installation Complete'];`;
const newHistory = `const historyStatuses = ['Dispatched', 'Delivered', 'Completed', 'Installation Complete'];`;

content = content.replace(targetScheduled, newScheduled);
content = content.replace(targetHistory, newHistory);

fs.writeFileSync('src/tabs/DispatchedTab.tsx', content);
console.log("Patched DispatchedTab logic to put Dispatched in history");
