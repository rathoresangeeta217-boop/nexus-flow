const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
run();
