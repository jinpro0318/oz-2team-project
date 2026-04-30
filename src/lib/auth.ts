import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  onAuthStateChanged,
  setPersistence,           // [효진] 세션 유지 설정 추가
  browserSessionPersistence, // [효진] 브라우저 종료 시 자동 로그아웃 설정 추가
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { setDocument, getDocument } from "./firestore";
import type { User } from "@/types";

export async function registerUser(
  email: string,
  password: string,
  nickname: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: User = {
    id: credential.user.uid,
    email,
    nickname,
    phone: "",
    addresses: [],
    createdAt: new Date().toISOString(),
    role: "user",
  };
  await setDocument("users", credential.user.uid, user);
  return user;
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  // [효진] 매번 로그인을 새로 하도록 세션 저장 방식으로 명시적 변경
  if (typeof window !== "undefined") {
    await setPersistence(auth, browserSessionPersistence);
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return getDocument<User>("users", credential.user.uid);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not authenticated");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function deleteAccount(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not authenticated");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  await deleteUser(user);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
