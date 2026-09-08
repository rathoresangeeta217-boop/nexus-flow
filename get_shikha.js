import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "orders"));
  snap.forEach(doc => {
    const data = doc.data();
    if (data.customer && data.customer.toUpperCase().includes("SHIKHA")) {
      console.log(data.id, data.status);
    }
  });
  process.exit(0);
}
run();
