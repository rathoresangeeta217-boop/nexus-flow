const fs = require('fs');
let content = fs.readFileSync('src/tabs/DispatchedTab.tsx', 'utf8');

const targetScheduled = `const scheduledStatuses = ['Scheduled Dispatched', 'Shipped', 'Out for Delivery', 'Installation Pending', 'Installation In Progress'];`;
const newScheduled = `const scheduledStatuses = ['Scheduled Dispatched', 'Shipped', 'Out for Delivery'];`;

const targetHistory = `const historyStatuses = ['Dispatched', 'Delivered', 'Completed', 'Installation Complete'];`;
const newHistory = `const historyStatuses = ['Dispatched', 'Installation Pending', 'Installation In Progress', 'Installation Complete', 'Delivered', 'Completed'];`;

content = content.replace(targetScheduled, newScheduled);
content = content.replace(targetHistory, newHistory);

fs.writeFileSync('src/tabs/DispatchedTab.tsx', content);
console.log("Patched DispatchedTab to put Installation statuses in history");
