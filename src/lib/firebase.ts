import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);

// Clean up stale firestore localStorage keys to resolve QuotaExceededError in browser
try {
  if (typeof window !== 'undefined') {
    const ls = window.localStorage;
    if (ls) {
      for (let i = ls.length - 1; i >= 0; i--) {
        const key = ls.key(i);
        if (key && (key.includes('firestore') || key.includes('firebase'))) {
          ls.removeItem(key);
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not prune localStorage", e);
}

const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, config.firestoreDatabaseId);

const auth = getAuth(app);
const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export { db, auth, storage };
