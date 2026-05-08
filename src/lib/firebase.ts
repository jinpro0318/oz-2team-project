import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore, initializeFirestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _persistenceApplied = false;

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  if (!firebaseConfig.apiKey) {
    throw new Error(
      "Firebase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_FIREBASE_* 값을 확인하세요."
    );
  }
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return _app;
}

function ensureAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(ensureApp());
    if (typeof window !== "undefined" && !_persistenceApplied) {
      setPersistence(_auth, browserSessionPersistence).catch(() => {});
      _persistenceApplied = true;
    }
  }
  return _auth;
}

function ensureDb(): Firestore {
  if (!_db) {
    const app = ensureApp();
    const isServer = typeof window === "undefined";

    if (isServer) {
      try {
        // 서버 사이드에서는 연결 안정성을 위해 별도의 명명된 인스턴스로 초기화
        _db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
        }, "server-db");
      } catch (e) {
        _db = getFirestore(app);
      }
    } else {
      _db = getFirestore(app);
    }
  }
  return _db;
}

function ensureStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(ensureApp());
  return _storage;
}

function lazyProxy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      const target = getter() as any;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(_t, prop, value) {
      const target = getter() as any;
      return Reflect.set(target, prop, value);
    },
    has(_t, prop) {
      return Reflect.has(getter() as any, prop);
    },
    ownKeys() {
      return Reflect.ownKeys(getter() as any);
    },
    getOwnPropertyDescriptor(_t, prop) {
      return Reflect.getOwnPropertyDescriptor(getter() as any, prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(getter() as any);
    },
  });
}

// [§v9.1] Proxy 제거: Firestore SDK와의 호환성을 위해 순수 인스턴스 사용
export const getRawDb = ensureDb;

// 초기화 보장 및 직접 수출
export const auth: Auth = ensureAuth();
export const db: Firestore = ensureDb();
export const storage: FirebaseStorage = ensureStorage();

export default ensureApp();
