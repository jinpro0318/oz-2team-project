/**
 * Firebase 시드 데이터 스크립트
 *
 * 실행 방법:
 *   npx tsx scripts/seed.ts
 *
 * 사전 요구:
 *   1. Firebase 프로젝트가 생성되어 있어야 합니다
 *   2. .env.local 파일에 Firebase 설정값이 입력되어 있어야 합니다
 *   3. tsx 패키지 설치: npm install -D tsx
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── 관리자 계정 ───
const ADMIN_EMAIL = "admin@code.com";
const ADMIN_PASSWORD = "admin123!";
const ADMIN_NICKNAME = "관리자";

// ─── 셀럽 데이터 ───
const celebrities = [
  {
    id: "jennie",
    name: "제니",
    handle: "@jennierubyjane",
    avatarUrl: "/images/celeb-jennie.jpg",
    bio: "BLACKPINK 제니 · Singer & Fashion Icon",
    commissionRate: 15,
    isActive: true,
    gradient: "linear-gradient(160deg,#1a1a14 0%,#3c3820 60%,#6B6030 100%)",
  },
  {
    id: "iu",
    name: "아이유",
    handle: "@dlwlrma",
    avatarUrl: "/images/celeb-iu.jpg",
    bio: "IU · Singer-Songwriter & Actress",
    commissionRate: 12,
    isActive: true,
    gradient: "linear-gradient(160deg,#1a1520 0%,#3c2848 60%,#6B3A7D 100%)",
  },
  {
    id: "v",
    name: "뷔",
    handle: "@thv",
    avatarUrl: "/images/celeb-v.jpg",
    bio: "BTS V · Singer & Visual Artist",
    commissionRate: 15,
    isActive: true,
    gradient: "linear-gradient(160deg,#1a1414 0%,#3c2020 60%,#6B3030 100%)",
  },
];

// ─── 상품 데이터 ───
const products = [
  {
    id: "prod_1",
    brand: "CHANEL",
    name: "트위드 크롭 재킷",
    price: 328000,
    originalPrice: 458000,
    discount: 28,
    colors: [
      { name: "크림", hex: "#F5F0E8" },
      { name: "블랙", hex: "#1A1A1A" },
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "클래식한 트위드 소재로 제작된 크롭 기장의 재킷입니다.",
    specs: { 소재: "트위드 (울 혼방)", 핏: "크롭 / 슬림", 원산지: "프랑스", 세탁: "드라이클리닝 권장" },
    imageUrls: ["/images/prod-jacket.jpg"],
    celebrityId: "jennie",
    salesCount: 1247,
    isVisible: true,
    category: "상의",
  },
  {
    id: "prod_2",
    brand: "ADIDAS",
    name: "미니 숏츠",
    price: 45000,
    originalPrice: 59000,
    discount: 24,
    colors: [
      { name: "블랙", hex: "#1A1A1A" },
      { name: "화이트", hex: "#FFFFFF" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "활동성과 스타일을 모두 갖춘 미니 숏츠입니다.",
    specs: { 소재: "폴리에스터 100%", 핏: "레귤러", 원산지: "베트남", 세탁: "기계 세탁 가능" },
    imageUrls: ["/images/prod-shorts.jpg"],
    celebrityId: "jennie",
    salesCount: 3892,
    isVisible: true,
    category: "하의",
  },
  {
    id: "prod_3",
    brand: "ADIDAS",
    name: "Superstar 스니커즈",
    price: 119000,
    originalPrice: 139000,
    discount: 14,
    colors: [
      { name: "화이트/블랙", hex: "#FFFFFF" },
      { name: "블랙/화이트", hex: "#1A1A1A" },
    ],
    sizes: ["230", "240", "250", "260", "270", "280"],
    description: "아디다스의 아이코닉한 Superstar 스니커즈입니다.",
    specs: { 소재: "천연가죽 / 합성소재", 굽높이: "3cm", 원산지: "인도네시아", 세탁: "물걸레 관리" },
    imageUrls: ["/images/prod-sneakers.jpg"],
    celebrityId: "jennie",
    salesCount: 5621,
    isVisible: true,
    category: "신발",
  },
  {
    id: "prod_4",
    brand: "GUCCI",
    name: "원숄더 실크 드레스",
    price: 278000,
    originalPrice: 378000,
    discount: 26,
    colors: [
      { name: "라벤더", hex: "#C4B8CC" },
      { name: "블랙", hex: "#1A1A1A" },
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "우아한 원숄더 디자인의 실크 드레스입니다.",
    specs: { 소재: "실크 100%", 핏: "A라인 / 미디 기장", 원산지: "이탈리아", 세탁: "드라이클리닝 전용" },
    imageUrls: ["/images/prod-dress.jpg"],
    celebrityId: "iu",
    salesCount: 892,
    isVisible: true,
    category: "상의",
  },
  {
    id: "prod_5",
    brand: "PRADA",
    name: "네이비 울 수트 셋업",
    price: 458000,
    originalPrice: 598000,
    discount: 23,
    colors: [
      { name: "네이비", hex: "#1B2838" },
      { name: "차콜", hex: "#36454F" },
    ],
    sizes: ["S", "M", "L", "XL"],
    description: "프리미엄 울 소재의 네이비 수트 셋업입니다.",
    specs: { 소재: "울 95% / 엘라스틴 5%", 핏: "슬림 테일러드", 원산지: "이탈리아", 세탁: "드라이클리닝 전용" },
    imageUrls: ["/images/prod-suit.jpg"],
    celebrityId: "v",
    salesCount: 634,
    isVisible: true,
    category: "상의",
  },
];

// ─── 포스트 데이터 ───
const posts = [
  {
    id: "post_jennie_1",
    celebrityId: "jennie",
    imageUrl: "/images/feed-jennie.jpg",
    caption: "오늘의 OOTD ✨ 봄 바이브스",
    likes: 2847593,
    comments: 45872,
    createdAt: "2026-04-12T10:30:00Z",
    hotspots: [
      { id: "hs1", productId: "prod_1", label: "트위드 크롭 재킷", price: "₩328,000", top: 28, left: 55 },
      { id: "hs2", productId: "prod_2", label: "미니 숏츠", price: "₩45,000", top: 55, left: 38 },
      { id: "hs3", productId: "prod_3", label: "Superstar", price: "₩119,000", top: 80, left: 28 },
    ],
  },
  {
    id: "post_iu_1",
    celebrityId: "iu",
    imageUrl: "/images/feed-iu.jpg",
    caption: "봄날의 산책 🌸",
    likes: 1923847,
    comments: 32145,
    createdAt: "2026-04-11T14:20:00Z",
    hotspots: [
      { id: "hs4", productId: "prod_4", label: "원숄더 드레스", price: "₩278,000", top: 48, left: 55 },
    ],
  },
  {
    id: "post_v_1",
    celebrityId: "v",
    imageUrl: "/images/feed-v.jpg",
    caption: "Classic never goes out of style 🖤",
    likes: 3129472,
    comments: 58923,
    createdAt: "2026-04-10T18:45:00Z",
    hotspots: [
      { id: "hs5", productId: "prod_5", label: "네이비 수트", price: "₩458,000", top: 55, left: 42 },
    ],
  },
];

async function seed() {
  console.log("🚀 시드 데이터 생성을 시작합니다...\n");

  // 1. 관리자 계정 생성
  console.log("👤 관리자 계정 생성 중...");
  try {
    const adminCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setDoc(doc(db, "users", adminCredential.user.uid), {
      id: adminCredential.user.uid,
      email: ADMIN_EMAIL,
      nickname: ADMIN_NICKNAME,
      phone: "",
      addresses: [],
      createdAt: new Date().toISOString(),
      role: "admin",
    });
    console.log(`   ✅ 관리자 계정 생성 완료: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } catch (err: any) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`   ⚠️  관리자 계정이 이미 존재합니다: ${ADMIN_EMAIL}`);
    } else {
      console.error("   ❌ 관리자 계정 생성 실패:", err.message);
    }
  }

  // 2. 셀럽 데이터
  console.log("\n🌟 셀럽 데이터 생성 중...");
  for (const celeb of celebrities) {
    await setDoc(doc(db, "celebrities", celeb.id), celeb);
    console.log(`   ✅ ${celeb.name} (${celeb.handle})`);
  }

  // 3. 상품 데이터
  console.log("\n🛍️  상품 데이터 생성 중...");
  for (const product of products) {
    await setDoc(doc(db, "products", product.id), product);
    console.log(`   ✅ ${product.brand} - ${product.name}`);
  }

  // 4. 포스트 데이터
  console.log("\n📸 포스트 데이터 생성 중...");
  for (const post of posts) {
    await setDoc(doc(db, "posts", post.id), post);
    const celeb = celebrities.find((c) => c.id === post.celebrityId);
    console.log(`   ✅ ${celeb?.name} 피드 (핫스팟 ${post.hotspots.length}개)`);
  }

  console.log("\n✨ 시드 데이터 생성이 완료되었습니다!");
  console.log("\n─── 관리자 로그인 정보 ───");
  console.log(`   이메일: ${ADMIN_EMAIL}`);
  console.log(`   비밀번호: ${ADMIN_PASSWORD}`);
  console.log(`   관리자 페이지: http://localhost:3000/admin`);
  console.log("──────────────────────\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("시드 실패:", err);
  process.exit(1);
});
