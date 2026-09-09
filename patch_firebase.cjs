const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

content = content.replace(
  "import { getFirestore } from 'firebase/firestore';",
  "import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';"
);

content = content.replace(
  "const db = getFirestore(app, config.firestoreDatabaseId);",
  `const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, config.firestoreDatabaseId);`
);

fs.writeFileSync('src/lib/firebase.ts', content);
console.log("Patched firebase.ts");
