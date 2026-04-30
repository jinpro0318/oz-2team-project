import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth"; // [효진] 인증 지속성 관련 임포트 추가
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

// [효진] 앱 로드 시 브라우저 세션 지속성 설정 (브라우저 종료 시 로그아웃)
// SSR 환경에서는 window 객체가 없으므로, 빌드 에러 및 서버 사이드 에러 방지를 위해 체크 로직을 추가했습니다.
if (typeof window !== "undefined") {
  setPersistence(auth, browserSessionPersistence);
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
