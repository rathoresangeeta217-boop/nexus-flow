const fs = require('fs');

async function listUsers() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId;
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users`;
  
  const fsRes = await fetch(firestoreUrl);
  const data = await fsRes.json();
  console.log(JSON.stringify(data, null, 2));
}
listUsers().catch(console.error);
