const fs = require('fs');

async function seed() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const apiKey = config.apiKey;
  const projectId = config.projectId;
  const databaseId = config.firestoreDatabaseId;

  const user = { name: "Marketing SRK", email: "marketing.srkmodular@gmail.com", password: "Password123!", role: "super_admin" };

  console.log(`Processing ${user.email}...`);
  let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
  });
  
  let data = await res.json();
  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true })
    });
    data = await res.json();
  }
  
  const uid = data.localId;
  const idToken = data.idToken;

  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, displayName: user.name, returnSecureToken: false })
  });

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
  const docData = {
    fields: {
      uid: { stringValue: uid },
      email: { stringValue: user.email },
      displayName: { stringValue: user.name },
      role: { stringValue: user.role },
      isActive: { booleanValue: true },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  };
  
  await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify(docData)
  });
  console.log("Marketing user seeded!");
}
seed().catch(console.error);
