const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  // Handle active tab fallback if a role doesn't have access to current tab
  let currentTab = activeTab;
  if (profile.role === 'sales_executive' && (activeTab === 'Purchase' || activeTab === 'Production' || activeTab === 'Analytics' || activeTab === 'Users')) { 
     currentTab = 'Orders';
  } else if (profile.role === 'admin' && (activeTab === 'Analytics' || activeTab === 'Users')) { 
     currentTab = 'Orders';
  }`;

const replacement = `  // Handle active tab fallback if a role doesn't have access to current tab
  let currentTab = activeTab;
  if (profile.role === 'employee' && activeTab !== 'Installation') {
     currentTab = 'Installation';
  } else if (profile.role === 'sales_executive' && (activeTab === 'Purchase' || activeTab === 'Production' || activeTab === 'Analytics' || activeTab === 'Users')) { 
     currentTab = 'Orders';
  } else if (profile.role === 'admin' && (activeTab === 'Analytics' || activeTab === 'Users')) { 
     currentTab = 'Orders';
  }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
