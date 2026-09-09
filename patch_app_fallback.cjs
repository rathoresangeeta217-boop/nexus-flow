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

if (content.includes("let currentTab = activeTab;")) {
  content = content.replace(/let currentTab = activeTab;[\s\S]*?currentTab = 'Orders';\s*}/, replacement.trim());
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched App.tsx");
} else {
  console.log("Could not find target in App.tsx");
}
