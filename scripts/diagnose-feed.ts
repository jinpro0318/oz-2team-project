/**
 * Firebase 진단: 셀럽 + 포스트 데이터 상태 확인
 *   npx tsx -r dotenv/config scripts/diagnose-feed.ts dotenv_config_path=.env.local
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log("=== celebrities ===");
  const celebSnap = await getDocs(collection(db, "celebrities"));
  const celebs: any[] = [];
  celebSnap.forEach((d) => {
    const data: any = d.data();
    celebs.push({ id: d.id, ...data });
    console.log(JSON.stringify({
      id: d.id,
      name: data.name,
      handle: data.handle,
      avatarUrl: data.avatarUrl,
      isActive: data.isActive,
      order: data.order,
    }, null, 2));
  });
  console.log(`총 ${celebs.length}명\n`);

  console.log("=== posts ===");
  const postSnap = await getDocs(collection(db, "posts"));
  const posts: any[] = [];
  postSnap.forEach((d) => {
    const data: any = d.data();
    posts.push({ id: d.id, ...data });
  });

  const byCeleb: Record<string, any[]> = {};
  for (const p of posts) {
    (byCeleb[p.celebrityId] ||= []).push(p);
  }
  const shorten = (s: any) => {
    if (typeof s !== "string") return s;
    if (s.length <= 80) return s;
    return `${s.slice(0, 60)}...(${s.length}자, ${s.startsWith("data:") ? "base64 data URI" : "긴 문자열"})`;
  };

  for (const [celebId, plist] of Object.entries(byCeleb)) {
    const celeb = celebs.find((c) => c.id === celebId);
    console.log(`\n[${celeb?.name || celebId}] (${celebId}) - ${plist.length}개 포스트`);
    plist.forEach((p) => {
      console.log(`  • doc id: ${p.id}`);
      console.log(`    imageUrl:   ${shorten(p.imageUrl)}`);
      const arr = Array.isArray(p.imageUrls) ? p.imageUrls.map(shorten) : p.imageUrls;
      console.log(`    imageUrls:  ${JSON.stringify(arr)}`);
      console.log(`    caption:    ${(p.caption || "").slice(0, 50)}`);
      console.log(`    hotspots:   ${(p.hotspots || []).length}개`);
      console.log(`    isHidden:   ${p.isHidden}`);
      console.log(`    isVisible:  ${p.isVisible}`);
      console.log(`    createdAt:  ${typeof p.createdAt === "object" ? JSON.stringify(p.createdAt) : p.createdAt}`);
    });
  }
  console.log(`\n총 ${posts.length}개 포스트`);

  console.log("\n=== celeb avatarUrl 상세 ===");
  celebs.forEach((c) => {
    console.log(`${c.name}(${c.id}): avatarUrl=${shorten(c.avatarUrl)} | gradient=${c.gradient ? "있음" : "없음"}`);
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
