const fs = require('fs');
const file = 'src/components/DispatchView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace standard alerts
content = content.replace(/alert\(/g, 'setAlertMessage(');

fs.writeFileSync(file, content);
