import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const SETTINGS_COL = "settings";
export const SYSTEM_DOC = "system";

export interface SystemSettings {
  mallAddress: string;
  mallZipCode: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COL, SYSTEM_DOC));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return { mallAddress: "경기도 고양시 일산동구", mallZipCode: "10414" }; // Default fallback
}

export async function updateSystemSettings(settings: Partial<SystemSettings>) {
  await setDoc(doc(db, SETTINGS_COL, SYSTEM_DOC), settings, { merge: true });
}
