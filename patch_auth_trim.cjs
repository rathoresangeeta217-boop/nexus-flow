const fs = require('fs');
const file = 'src/components/AuthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "await signInWithEmailAndPassword(auth, email, password);",
  "await signInWithEmailAndPassword(auth, email.trim(), password);"
);

content = content.replace(
  "onChange={(e) => setEmail(e.target.value)}",
  "onChange={(e) => setEmail(e.target.value.trim())}"
);

fs.writeFileSync(file, content);
