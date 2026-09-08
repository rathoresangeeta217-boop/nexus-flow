import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-nexusflowenterpr-71986131-a5cc-4eb8-8637-e19c6c912d2c");

async function run() {
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(doc => {
    console.log(doc.data().displayName, doc.data().role, doc.data().email);
  });
  process.exit(0);
}
run();
