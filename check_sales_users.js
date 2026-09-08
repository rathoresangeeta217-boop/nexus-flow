import admin from 'firebase-admin';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "test@test.com",
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n')
  })
});
