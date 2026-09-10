const fs = require('fs');
let content = fs.readFileSync('src/lib/orders.ts', 'utf8');

const targetFilter = `        // Filter orders for sales executives and employees
        if (profile && (profile.role === 'sales_executive' || profile.role === 'employee')) {
          const profileName = (profile.displayName || '').toLowerCase().trim();
          
          orders = orders.filter(order => {
            const empName = (order.details?.employeeName || '').toLowerCase().trim();
            if (!empName) return false;
            
            const empFirstName = empName.split(' ')[0];
            const profileFirstName = profileName.split(' ')[0];
            
            return empName === profileName || 
                   profileName.includes(empName) || 
                   empName.includes(profileName) ||
                   (empFirstName && profileFirstName && empFirstName === profileFirstName);
          });
        }`;

const newFilter = `        // Filter orders for sales executives and employees
        if (profile && profile.role === 'sales_executive') {
          const profileName = (profile.displayName || '').toLowerCase().trim();
          
          orders = orders.filter(order => {
            const empName = (order.details?.employeeName || '').toLowerCase().trim();
            if (!empName) return false;
            
            const empFirstName = empName.split(' ')[0];
            const profileFirstName = profileName.split(' ')[0];
            
            return empName === profileName || 
                   profileName.includes(empName) || 
                   empName.includes(profileName) ||
                   (empFirstName && profileFirstName && empFirstName === profileFirstName);
          });
        } else if (profile && profile.role === 'employee') {
          // Employees in the installation tab should see all relevant installation orders
          // or at least not be restricted ONLY to sales executive orders
          const profileName = (profile.displayName || '').toLowerCase().trim();
          
          orders = orders.filter(order => {
            const empName = (order.details?.employeeName || '').toLowerCase().trim();
            const installerName = (order.details?.installerName || '').toLowerCase().trim();
            
            // If they are specifically named, show it
            const empFirstName = empName.split(' ')[0];
            const instFirstName = installerName.split(' ')[0];
            const profileFirstName = profileName.split(' ')[0];
            
            const isAssigned = empName === profileName || 
                   profileName.includes(empName) || 
                   empName.includes(profileName) ||
                   (empFirstName && profileFirstName && empFirstName === profileFirstName) ||
                   installerName === profileName ||
                   profileName.includes(installerName) ||
                   installerName.includes(profileName) ||
                   (instFirstName && profileFirstName && instFirstName === profileFirstName);
                   
            // Alternatively, employees (like Anshuman) managing installations should see all installation orders
            // We'll let them see ALL orders, and the InstallationTab will filter to only show installation ones.
            // If we restrict to isAssigned, they might see 0 if not explicitly assigned.
            // Let's allow them to see all orders if they are an employee. The UI restricts them to the Installation tab anyway.
            return true;
          });
        }`;

content = content.replace(targetFilter, newFilter);

fs.writeFileSync('src/lib/orders.ts', content);
console.log("Patched orders filter");
