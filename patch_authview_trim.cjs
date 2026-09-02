const fs = require('fs');
const file = 'src/components/AuthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "await signInWithEmailAndPassword(auth, email.trim(), password);",
  "await signInWithEmailAndPassword(auth, email.trim(), password.trim());"
);

content = content.replace(
  "onChange={(e) => setPassword(e.target.value)}",
  "onChange={(e) => setPassword(e.target.value.trim())}"
);

fs.writeFileSync(file, content);
