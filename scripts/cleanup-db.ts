import { db } from "../src/lib/firebase";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

async function cleanupCollections() {
  const collections = ["orders", "shipments"];
  
  for (const collName of collections) {
    console.log(`🧹 Cleaning up collection: ${collName}...`);
    const querySnapshot = await getDocs(collection(db, collName));
    const batch = writeBatch(db);
    
    let count = 0;
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, collName, document.id));
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${count} documents from ${collName}.`);
    } else {
      console.log(`ℹ️ Collection ${collName} is already empty.`);
    }
  }
}

cleanupCollections()
  .then(() => {
    console.log("✨ All target collections have been cleared.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  });
