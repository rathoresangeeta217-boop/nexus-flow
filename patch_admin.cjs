const fs = require('fs');
const file = 'src/components/AdminApprovalView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "alert(`Challan creation ${status.toLowerCase()} successfully.`);",
  "window.location.href = '/';"
);

fs.writeFileSync(file, content);
