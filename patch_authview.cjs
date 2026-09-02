const fs = require('fs');
const file = 'src/components/AuthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  '<h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Nexus Flow</h1>',
  '<h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to SRK Modular Furniture co.</h1>'
);

content = content.replace(
  /        <div className="relative mb-6">[\s\S]*?<img src="https:\/\/www\.gstatic\.com\/firebasejs\/ui\/2\.0\.0\/images\/auth\/google\.svg" alt="Google" className="w-6 h-6" \/>\s*Google\s*<\/button>/,
  ""
);

fs.writeFileSync(file, content);
