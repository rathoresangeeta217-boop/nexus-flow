const fs = require('fs');
let content = fs.readFileSync('src/tabs/OrdersTab.tsx', 'utf8');

const targetSort = `    }
    
    return true;
  });`;

const newSort = `    }
    
    return true;
  }).sort((a, b) => {
    // Helper to get a comparable date time
    const getTime = (order) => {
      if (order.createdAt?.seconds) {
        return order.createdAt.seconds * 1000;
      }
      if (order.date) {
        const d = new Date(order.date);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      return 0; // fallback
    };
    
    return getTime(b) - getTime(a); // Descending order (newest first)
  });`;

content = content.replace(targetSort, newSort);

fs.writeFileSync('src/tabs/OrdersTab.tsx', content);
console.log("Patched order sorting");
