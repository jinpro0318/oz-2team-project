import * as admin from "firebase-admin";

/**
 * [v9.0] Firebase Admin SDK 초기화 (서버 사이드 전용)
 * - 마스터키를 통해 DB 연결 안정성 및 권한 문제 해결
 */

const project_id = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const client_email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;


function resolvePrivateKey(): string | undefined {
  const b64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  if (b64 && b64.trim()) {
    try {
      return Buffer.from(b64.trim(), "base64").toString("utf-8");
    } catch (e) {
      console.error("[Firebase Admin] BASE64 디코딩 실패:", e);
    }
  }

  let raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!raw) return undefined;
  raw = raw.trim();
  // Vercel UI에 따옴표째 붙여넣었을 경우 제거
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  // 단일 라인 형태("...\n...")로 들어왔다면 실제 개행으로 치환
  return raw.replace(/\\n/g, "\n");
}

const private_key = resolvePrivateKey();

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // 마스터키 정보가 있는 경우에만 Admin SDK 초기화
  if (project_id && client_email && private_key) {
    try {
      console.log("[Firebase Admin] Attempting to initialize with Project ID:", project_id);
      console.log("[Firebase Admin] Client Email:", client_email);
      console.log("[Firebase Admin] Private Key Length:", private_key.length);
    try {
      console.log("[Firebase Admin] Attempting to initialize with Project ID:", project_id);
      
      const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: project_id,
          clientEmail: client_email,
          privateKey: private_key,
        }),
        storageBucket: storageBucket,
      });
    } catch (error) {
      console.error("[Firebase Admin] Initialization failed:", error);
    }
  } else {
    console.warn("[Firebase Admin] Missing required environment variables:", {
      project_id: !!project_id,
      client_email: !!client_email,
      private_key: !!private_key
    });
  }

  // 마스터키가 없으면 null 반환 (Fallback 처리용)
  console.warn("[Firebase Admin] No master key found. Admin features might be limited.");
  return null;
}

const adminApp = getAdminApp();

// 서비스 내보내기
export const adminDb = adminApp ? adminApp.firestore() : null;
export const adminAuth = adminApp ? adminApp.auth() : null;
export const adminStorage = adminApp ? adminApp.storage() : null;

export default admin;
