import * as admin from "firebase-admin";

/**
 * [v9.0] Firebase Admin SDK 초기화 (서버 사이드 전용)
 * - 마스터키를 통해 DB 연결 안정성 및 권한 문제 해결
 */

const project_id = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const client_email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const private_key = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
      console.log("[Firebase Admin] Private Key Start:", private_key.substring(0, 50));

      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: project_id,
          clientEmail: client_email,
          privateKey: private_key,
        }),
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

export default admin;
