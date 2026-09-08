const fs = require('fs');

const path = 'src/tabs/OrdersTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `        } else if (dateFilter === 'month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'year') {`;

const replacement1 = `        } else if (dateFilter === 'month') {
          if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'lastMonth') {
          let expectedMonth = now.getMonth() - 1;
          let expectedYear = now.getFullYear();
          if (expectedMonth < 0) {
            expectedMonth = 11;
            expectedYear -= 1;
          }
          if (orderDate.getMonth() !== expectedMonth || orderDate.getFullYear() !== expectedYear) return false;
        } else if (dateFilter === 'year') {`;

const target2 = `              <option value="month">This Month</option>
              <option value="year">This Year</option>`;

const replacement2 = `              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="year">This Year</option>`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync(path, content);
  console.log("Successfully updated date filters.");
} else {
  console.log("Could not find target strings.");
}
