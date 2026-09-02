const fs = require('fs');
const file = 'src/components/DispatchView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  `    if (status === 'Rejected') {
      alert('Challan generation was rejected by admin.');
      return;
    }`,
  `    if (status === 'Rejected') {
      const confirmResend = window.confirm('Your previous challan request was rejected by admin. Do you want to submit a new reason?');
      if (!confirmResend) return;
    }`
);

fs.writeFileSync(file, content);
