import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryConstraint,
  setDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

function convertTimestamps(data: any): any {
  if (!data || typeof data !== "object") return data;
  
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    } else if (Array.isArray(result[key])) {
      result[key] = result[key].map(convertTimestamps);
    } else if (typeof result[key] === "object") {
      result[key] = convertTimestamps(result[key]);
    }
  }
  return result;
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as T;
}

export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) }) as T);
}

export function subscribeDocument<T>(
  collectionName: string,
  id: string,
  onUpdate: (data: T | null) => void
) {
  const docRef = doc(db, collectionName, id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as T);
    } else {
      onUpdate(null);
    }
  });
}

export function subscribeDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  onUpdate: (data: T[]) => void
) {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...convertTimestamps(d.data()) }) as T);
    onUpdate(data);
  });
}

export async function createDocument(
  collectionName: string,
  data: DocumentData
): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function setDocument(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// 서브컬렉션 헬퍼
export async function getSubDocuments<T>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const colRef = collection(db, parentCollection, parentId, subCollection);
  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function setSubDocument(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  docId: string,
  data: DocumentData
): Promise<void> {
  const docRef = doc(db, parentCollection, parentId, subCollection, docId);
  await setDoc(docRef, data, { merge: true });
}

export async function deleteSubDocument(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  docId: string
): Promise<void> {
  await deleteDoc(doc(db, parentCollection, parentId, subCollection, docId));
}

export async function clearSubCollection(
  parentCollection: string,
  parentId: string,
  subCollection: string
): Promise<void> {
  const colRef = collection(db, parentCollection, parentId, subCollection);
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export { collection, doc, query, where, orderBy, limit, db };
