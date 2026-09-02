const fs = require('fs');
const file = 'src/components/AdminApprovalView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const target = "      await saveOrder(updatedOrder);\n      setOrder(updatedOrder);\n      alert(`Challan creation \\${status.toLowerCase()} successfully.`);";
const replacement = "      await saveOrder(updatedOrder);\n      setOrder(updatedOrder);\n      window.location.href = '/';";

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
