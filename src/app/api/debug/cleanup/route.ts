import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

export async function GET() {
  const colls = ["orders", "shipments"];
  const results: any = {};
  
  for (const name of colls) {
    const snap = await getDocs(collection(db, name));
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach(d => {
      batch.delete(doc(db, name, d.id));
      count++;
    });
    if (count > 0) await batch.commit();
    results[name] = count;
  }
  
  return NextResponse.json({ success: true, deleted: results });
}
