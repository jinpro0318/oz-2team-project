/**
 * Firebase Storage 내 avatars/ 폴더 파일 목록 확인
 *   npx tsx -r dotenv/config scripts/list-storage.ts dotenv_config_path=.env.local
 */

import { initializeApp } from "firebase/app";
import { getStorage, ref, listAll, getMetadata, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function listFolder(path: string) {
  console.log(`\n=== ${path}/ ===`);
  try {
    const folderRef = ref(storage, path);
    const result = await listAll(folderRef);
    if (result.items.length === 0 && result.prefixes.length === 0) {
      console.log("  (비어있음 또는 접근 불가)");
      return;
    }
    for (const itemRef of result.items) {
      try {
        const meta = await getMetadata(itemRef);
        const url = await getDownloadURL(itemRef);
        console.log(`  • ${itemRef.fullPath}`);
        console.log(`    크기: ${(meta.size / 1024).toFixed(1)}KB`);
        console.log(`    생성: ${meta.timeCreated}`);
        console.log(`    URL: ${url.slice(0, 100)}...`);
      } catch (e: any) {
        console.log(`  • ${itemRef.fullPath} (메타데이터 접근 실패: ${e.code})`);
      }
    }
    for (const subRef of result.prefixes) {
      await listFolder(subRef.fullPath);
    }
  } catch (e: any) {
    console.log(`  ❌ ${e.code || e.message}`);
  }
}

async function main() {
  console.log("Firebase Storage 폴더 스캔");
  console.log("프로젝트:", firebaseConfig.projectId);
  console.log("버킷:", firebaseConfig.storageBucket);

  await listFolder("avatars");
  await listFolder("posts");
  await listFolder("");

  process.exit(0);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
