const fs = require('fs');
const file = 'src/lib/firebase.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  "import { getAuth, signInAnonymously } from 'firebase/auth';",
  "import { getAuth, GoogleAuthProvider } from 'firebase/auth';"
);

content = content.replace(
  "// Authenticate anonymously\nsignInAnonymously(auth).catch(console.error);\n",
  "export const googleProvider = new GoogleAuthProvider();\n"
);

fs.writeFileSync(file, content);
