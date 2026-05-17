import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
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
  // Next.js SSR 환경에서 Firebase Auth 초기화 시 발생하는 에러를 방지하기 위해 window 체크를 수행합니다.
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

export async function verifyPassword(password: string): Promise<boolean> {
  const user = auth.currentUser;
  
  if (!user || !user.email) {
    console.error("[Auth] No active Firebase user found in verifyPassword.");
    return false;
  }

  // 정확한 공백 포함 여부를 확인하기 위해 원본 비밀번호 사용 (trim 제거)
  if (!password || password.length < 4) return false;

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (error: any) {
    if (error.code === "auth/too-many-requests") {
      console.warn("[Auth] Firebase Rate Limit hit. Please wait a moment.");
    }
    // invalid-credential(비밀번호 오답)은 정상적인 UI 흐름이므로 콘솔 에러나 throw를 발생시키지 않고 조용히 false를 반환합니다.
    return false;
  }
}
