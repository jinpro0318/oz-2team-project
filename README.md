# C.O.D.E. — Celebrity Outfit Daily Edition

셀럽의 데일리 착장을 발견하고 바로 구매할 수 있는 패션 커머스 플랫폼 MVP입니다.

---

## 목차

1. [기술 스택](#기술-스택)
2. [아키텍처 개요](#아키텍처-개요)
3. [사전 준비](#사전-준비)
4. [프로젝트 설치](#프로젝트-설치)
5. [Firebase 설정](#firebase-설정)
6. [환경 변수 설정](#환경-변수-설정)
7. [시드 데이터 생성](#시드-데이터-생성)
8. [개발 서버 실행](#개발-서버-실행)
9. [프로젝트 구조](#프로젝트-구조)
10. [주요 라우트](#주요-라우트)
11. [데이터 흐름](#데이터-흐름)
12. [계정 정보](#계정-정보)
13. [주의 사항](#주의-사항)

---

## 기술 스택

| 분류                | 기술                                                              |
| ------------------- | ----------------------------------------------------------------- |
| **프레임워크**      | Next.js 15.5 (App Router) + TypeScript 5                          |
| **스타일링**        | Tailwind CSS v4 + Ant Design 6                                    |
| **서버 상태**       | TanStack Query v5 (캐싱, 패칭, 뮤테이션)                          |
| **클라이언트 상태** | Zustand (auth · cart · UI 상태)                                   |
| **BaaS**            | Firebase 11 (Authentication + Firestore + Storage) + Admin SDK 13 |
| **결제**            | TossPayments SDK (테스트 모드)                                    |
| **주소 검색**       | react-daum-postcode                                               |
| **애니메이션/아이콘** | motion + lucide-react                                           |
| **배포**            | Vercel                                                            |

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────┐
│                  Client                      │
│                                             │
│  React Pages ──▶ TanStack Query ──▶ Firestore│
│       │                                      │
│       └──▶ Zustand (auth, cart, ui 스토어)   │
│       │                                      │
│       └──▶ Firebase Auth (로그인/회원가입)    │
└─────────────────────────────────────────────┘
```

- **모든 서버 데이터** (셀럽, 상품, 피드, 이벤트, 장바구니, 찜, 주문, 교환/반품, 정산)는 **Firestore + TanStack Query** 조합으로 관리합니다.
- **Zustand**는 인증 세션(`authStore`), 장바구니(`cartStore`), UI 플래그(`uiStore`) 같은 클라이언트 상태에 사용합니다.
- 찜 목록은 Firestore 서브컬렉션(`users/{uid}/wishlist/`)에 저장되어 기기 간 동기화가 됩니다.
- 결제·물류 처리는 `src/app/api/` 하위 라우트(TossPayments 확인, 코드 물류 트래킹, 이미지 업로드)에서 서버 사이드로 수행합니다.

---

## 사전 준비

아래 도구가 설치되어 있어야 합니다:

- **Node.js** 18 이상 (20+ 권장)
- **npm** 9 이상
- **Firebase 프로젝트** (팀에서 하나를 공유합니다 — 아래 참조)

---

## 프로젝트 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd oz-2team-project

# 2. 의존성 설치
npm install
```

> `npm install`이 완료되면 `node_modules/` 폴더가 생성됩니다.

---

## Firebase 설정

### 팀 공유 Firebase 프로젝트

이 프로젝트는 **팀원 전체가 하나의 Firebase 프로젝트를 공유**합니다. 각자 개별 Firebase 프로젝트를 만들 필요가 없습니다.

팀 리더에게 아래 정보를 받으세요:

- Firebase 프로젝트의 웹 앱 설정값 (API Key, Auth Domain 등)
- TossPayments 테스트 키 (선택)

### 신규 Firebase 프로젝트를 만들어야 하는 경우

만약 처음부터 Firebase를 세팅해야 한다면:

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Authentication** 활성화
   - 로그인 방법 → **이메일/비밀번호** 사용 설정
3. **Firestore Database** 생성
   - 위치: `asia-northeast3` (서울) 권장
   - 보안 규칙: 개발 중에는 테스트 모드로 시작
4. **Storage** 활성화 (이미지 업로드용)
5. 프로젝트 설정 → 일반 → **웹 앱 추가** → 표시되는 설정값을 복사

### Firestore 컬렉션 구조

시드 스크립트가 자동으로 생성하는 컬렉션:

| 컬렉션                  | 설명                      |
| ----------------------- | ------------------------- |
| `celebrities/{celebId}` | 셀럽 프로필               |
| `products/{productId}`  | 상품 정보 (색상/사이즈 옵션 포함) |
| `posts/{postId}`        | 피드 포스트 (핫스팟·이미지 다중) |
| `events/{eventId}`      | 진행 중 이벤트 (배너·노출 일정) |
| `users/{userId}`        | 사용자 프로필             |

앱 사용 중 자동 생성되는 컬렉션:

| 컬렉션                                | 설명                  |
| ------------------------------------- | --------------------- |
| `users/{userId}/wishlist/{productId}` | 찜 목록 (서브컬렉션)  |
| `orders/{orderId}`                    | 주문                  |
| `exchanges/{exchangeId}`              | 교환/반품             |
| `settlements/{settlementId}`          | 셀럽별 정산           |

---

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 채웁니다.
(`.env.example` 파일을 복사해서 시작할 수 있습니다.)

```bash
# .env.example을 복사하여 .env.local 생성
cp .env.example .env.local
```

```env
# Firebase Client (팀 리더에게 받은 값으로 채우기)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (서버 사이드 — API Route, 시드 스크립트용)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# TossPayments (선택 — 결제 테스트 시 필요)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_your_client_key
TOSS_PAYMENTS_SECRET_KEY=test_sk_your_secret_key
```

> `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.  
> **절대로 Firebase 키를 공개 저장소에 올리지 마세요.**

---

## 시드 데이터 생성

> **이 단계를 건너뛰면 앱에 표시할 셀럽, 상품, 피드 데이터가 없습니다.**  
> 팀에서 누군가 이미 시드를 실행했다면, 동일한 Firebase 프로젝트를 공유하는 다른 팀원은 다시 실행할 필요가 없습니다.

```bash
npm run seed
```

이 명령어는 `scripts/seed.ts`를 실행하여 아래 작업을 수행합니다:

1. **관리자 계정** 생성 (Firebase Auth + Firestore `users` 컬렉션)
2. **셀럽 3명** 데이터 생성 (`celebrities` 컬렉션: 제니, 아이유, 뷔)
3. **상품 5개** 데이터 생성 (`products` 컬렉션)
4. **피드 포스트 3개** 데이터 생성 (`posts` 컬렉션, 핫스팟 포함)

실행 결과 예시:

```
🚀 시드 데이터 생성을 시작합니다...

👤 관리자 계정 생성 중...
   ✅ 관리자 계정 생성 완료: admin@code.com / admin123!

🌟 셀럽 데이터 생성 중...
   ✅ 제니 (@jennierubyjane)
   ✅ 아이유 (@dlwlrma)
   ✅ 뷔 (@thv)

🛍️  상품 데이터 생성 중...
   ✅ CHANEL - 트위드 크롭 재킷
   ✅ ADIDAS - 미니 숏츠
   ...

📸 포스트 데이터 생성 중...
   ✅ 제니 피드 (핫스팟 3개)
   ✅ 아이유 피드 (핫스팟 1개)
   ✅ 뷔 피드 (핫스팟 1개)

✨ 시드 데이터 생성이 완료되었습니다!
```

> 관리자 계정이 이미 존재하면 "이미 존재합니다" 메시지가 뜨며, 셀럽/상품/포스트 데이터는 덮어쓰기(upsert)됩니다.  
> 여러 번 실행해도 안전합니다.

---

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 열기: **http://localhost:3000**

> 자동으로 `/feed` 페이지로 리디렉션됩니다.

### 사용 가능한 스크립트

| 명령어          | 설명                                   |
| --------------- | -------------------------------------- |
| `npm run dev`   | 개발 서버 실행 (http://localhost:3000) |
| `npm run build` | 프로덕션 빌드                          |
| `npm run start` | 프로덕션 서버 실행 (빌드 후)           |
| `npm run lint`  | ESLint 검사                            |
| `npm run seed`  | Firebase에 시드 데이터 생성            |

---

## 프로젝트 구조

```
oz-2team-project/
├── scripts/
│   └── seed.ts                  # Firebase 시드 데이터 스크립트
├── public/                      # 정적 자산 (이미지, 폰트 등)
├── src/
│   ├── app/                     # Next.js App Router 페이지
│   │   ├── (auth)/              # 인증 페이지 (로그인, 회원가입)
│   │   ├── (main)/              # 모바일 메인 (피드, 검색, 찜, 마이페이지, 이벤트 상세)
│   │   ├── admin/               # 어드민 대시보드 (관리자 전용)
│   │   ├── api/                 # API 라우트 (결제 확인, 물류 트래킹, 업로드)
│   │   ├── cart/                # 장바구니
│   │   ├── checkout/            # 결제
│   │   ├── exchange/[orderId]/  # 교환/반품 신청
│   │   ├── order-complete/      # 주문 완료
│   │   ├── orders/              # 주문 내역/상세 (cancel·confirm 포함)
│   │   ├── product/[id]/        # 상품 상세
│   │   ├── error.tsx            # 전역 에러 바운더리
│   │   ├── globals.css          # 전역 스타일 (Tailwind v4)
│   │   ├── layout.tsx           # 루트 레이아웃
│   │   └── page.tsx             # / → /feed 리디렉트
│   ├── components/
│   │   ├── admin/               # 어드민 컴포넌트 (AdminGuard, Sidebar, Header, ImageUpload)
│   │   ├── auth/                # 인증 보조 컴포넌트 (PasswordInputGroup 등)
│   │   ├── common/              # 공통 컴포넌트 (TopBar, BottomNav, Providers, LoginInducement)
│   │   ├── event/               # 이벤트 카드
│   │   ├── feed/                # 피드 (PostCard, StoryStrip, HotspotImage, InstagramBar)
│   │   ├── mypage/              # 마이페이지 보조 (AddressAddSheet, EmailProtector 등)
│   │   └── order/               # 주문 (DeliveryTracking)
│   ├── hooks/                   # TanStack Query 커스텀 훅
│   │   ├── useAuth.ts           # 인증 가드 훅
│   │   ├── useCart.ts           # 장바구니 CRUD
│   │   ├── useCelebrities.ts    # 셀럽 목록/상세
│   │   ├── useDaumPostcode.ts   # 다음 우편번호
│   │   ├── useEvents.ts         # 이벤트 목록/상세
│   │   ├── useOrders.ts         # 주문/교환 관련
│   │   ├── usePosts.ts          # 피드 포스트
│   │   ├── useProducts.ts       # 상품 목록/상세
│   │   ├── useRequireAdmin.ts   # 어드민 권한 가드
│   │   ├── useSettlements.ts    # 정산 데이터
│   │   └── useWishlist.ts       # 찜 목록 CRUD
│   ├── lib/
│   │   ├── services/            # Firestore 서비스 레이어 (도메인별)
│   │   │   ├── cart.ts          # users/{uid}/cart
│   │   │   ├── celebrity.ts     # celebrities
│   │   │   ├── events.ts        # events
│   │   │   ├── exchange.ts      # exchanges
│   │   │   ├── logistics.ts     # 코드 물류 처리 (클라이언트)
│   │   │   ├── logistics-server.ts # 서버 사이드 물류 헬퍼
│   │   │   ├── order.ts         # orders
│   │   │   ├── post.ts          # posts
│   │   │   ├── product.ts       # products
│   │   │   ├── settings.ts      # 사이트 설정
│   │   │   ├── settlement.ts    # 셀럽별 정산
│   │   │   ├── upload.ts        # 이미지 압축/업로드
│   │   │   ├── user.ts          # 사용자 프로필
│   │   │   └── wishlist.ts      # users/{uid}/wishlist
│   │   ├── utils/               # 가격 계산 등 유틸
│   │   ├── antdTheme.ts         # Ant Design 테마
│   │   ├── auth.ts              # Firebase Auth 함수
│   │   ├── firebase.ts          # Firebase Client 초기화
│   │   ├── firebase-admin.ts    # Firebase Admin SDK 초기화
│   │   └── firestore.ts         # Firestore CRUD 헬퍼 (범용)
│   ├── stores/
│   │   ├── authStore.ts         # 세션·로그인 프롬프트 상태
│   │   ├── cartStore.ts         # 장바구니 클라이언트 상태
│   │   └── uiStore.ts           # 하단 네비 노출 등 UI 플래그
│   └── types/
│       └── index.ts             # TypeScript 인터페이스 정의
├── .env.example                 # 환경 변수 템플릿
├── .env.local                   # 환경 변수 (Git 제외)
├── next.config.ts               # Next.js 설정
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## 주요 라우트

### 모바일 (390px 기준)

| 경로                     | 화면          | 설명                                                         |
| ------------------------ | ------------- | ------------------------------------------------------------ |
| `/feed`                  | 메인 피드     | 셀럽별 인스타 스타일 피드 + 핫스팟 (진입마다 순서 셔플)      |
| `/event/[id]`            | 이벤트 상세   | 진행 이벤트 hero 배너 + 상세 페이지                          |
| `/login`                 | 로그인        | 이메일/비밀번호                                              |
| `/register`              | 회원가입      | 2단계 폼 (이메일 → 닉네임)                                   |
| `/search`                | 검색          | 셀럽/상품 통합 검색                                          |
| `/product/[id]`          | 상품 상세     | 색상/사이즈 선택, 장바구니, 찜, 바로 구매                    |
| `/cart`                  | 장바구니      | 수량 조절, 삭제, 결제 진행 (색상 연결 이미지 우선 노출)      |
| `/checkout`              | 주문/결제     | 배송지 입력 (다음 우편번호) + TossPayments 결제 수단         |
| `/order-complete`        | 결제 완료     | 주문 확인                                                    |
| `/orders`                | 주문 내역     | 상태별 필터 (전체/배송중/배송완료/취소교환)                  |
| `/orders/[id]`           | 주문 상세     | 배송 추적 + 타임라인                                         |
| `/orders/[id]/cancel`    | 주문 취소     | 취소 사유 입력 + 환불 안내                                   |
| `/orders/[id]/confirm`   | 구매 확정     | 배송 완료 후 구매 확정 처리                                  |
| `/exchange/[orderId]`    | 교환/반품     | 사유 선택 → Firestore 저장                                   |
| `/wishlist`              | 찜 목록       | 그리드 레이아웃, 색상별 이미지 우선 표시                     |
| `/mypage`                | 마이페이지    | 프로필, 주문 내역, 고객센터 메뉴                             |
| `/mypage/profile`        | 프로필 편집   | 닉네임/연락처 수정 + 계정 탈퇴                               |
| `/mypage/password`       | 비밀번호 변경 | 현재 비밀번호 확인 + 강도 표시                               |
| `/mypage/support`        | 고객센터      | 전화 연결 + FAQ 아코디언                                     |

### 어드민 (데스크톱 1280px+, 관리자 권한 필요)

| 경로                  | 화면           | 설명                                                  |
| --------------------- | -------------- | ----------------------------------------------------- |
| `/admin`              | 대시보드       | KPI 카드, 셀럽별 매출, 요일별 매출, 최근 주문         |
| `/admin/products`     | 상품 관리      | 상품 등록·수정 (색상/사이즈 옵션), 노출 상태 토글     |
| `/admin/orders`       | 주문 관리      | 주문 테이블, 상태 변경 (출고/완료/취소)               |
| `/admin/celebrities`  | 셀럽 관리      | 셀럽 통합 관리 드로어 (프로필 + 착장 + 핫스팟 편집)   |
| `/admin/events`       | 이벤트 관리    | 이벤트 등록/수정, 배너 업로드, 노출 일정              |
| `/admin/analytics`    | 매출 분석      | KPI, 요일별 매출 차트, 셀럽별 비중                    |
| `/admin/settlements`  | 정산 관리      | 셀럽별 미지급 커미션 현황, 정산 처리                  |
| `/admin/exchanges`    | 교환/반품 관리 | 교환·반품 신청 검토, 승인/반려                        |

> 어드민 페이지는 `AdminGuard` + `useRequireAdmin` 훅이 보호합니다.  
> 비로그인 시 → `/login?redirect=/admin`으로 리디렉트  
> 일반 사용자 → 403 접근 거부 화면 표시

### API 라우트 (서버 사이드)

| 경로                                                            | 설명                                |
| --------------------------------------------------------------- | ----------------------------------- |
| `/api/payment/confirm`                                          | TossPayments 결제 승인 확인         |
| `/api/upload`                                                   | 이미지 압축 + Firebase Storage 업로드 |
| `/api/code-logistics/[carrierCode]/[trackingNumber]`            | 코드 물류 트래킹 상태 조회          |
| `/api/code-logistics/skip`                                      | 물류 단계 스킵 (테스트용)           |
| `/api/debug/cleanup`                                            | 디버그용 데이터 정리                |

---

## 데이터 흐름

### 읽기 (조회)

```
페이지 컴포넌트
  └──▶ TanStack Query 훅 (useProducts, useCelebrities, useCart 등)
         └──▶ Firestore 서비스 함수 (src/lib/services/*.ts)
                └──▶ Firestore CRUD 헬퍼 (src/lib/firestore.ts)
                       └──▶ Firebase Firestore SDK
```

### 쓰기 (생성/수정/삭제)

```
사용자 액션 (장바구니 담기, 주문, 교환 신청 등)
  └──▶ TanStack Query useMutation
         └──▶ Firestore 서비스 함수
                └──▶ Firestore에 기록
         └──▶ invalidateQueries → 자동으로 목록 갱신
```

### 인증

```
Firebase Auth (로그인/회원가입)
  └──▶ onAuthStateChanged (Providers.tsx 내 AuthWatcher)
         └──▶ Firestore users 컬렉션에서 프로필 조회
                └──▶ Zustand authStore.user에 저장
```

---

## 계정 정보

### 관리자 계정 (시드 스크립트로 생성)

| 항목          | 값                          |
| ------------- | --------------------------- |
| 이메일        | `admin@code.com`            |
| 비밀번호      | `admin123!`                 |
| 역할          | `admin`                     |
| 관리자 페이지 | http://localhost:3000/admin |

### 일반 사용자

- `/register` 페이지에서 자유롭게 가입 가능
- 가입 시 `role: "user"`로 설정되어 어드민 접근 불가

---

## 주의 사항

### Firebase 공유

- **팀원 전체가 동일한 Firebase 프로젝트를 사용**합니다. `.env.local`의 Firebase 설정값은 팀 리더가 공유한 동일한 값을 사용해야 합니다.
- 각자 다른 Firebase 프로젝트를 사용하면 데이터가 분리되어 협업이 불가합니다.
- `npm run seed`는 팀에서 **최초 1명만** 실행하면 됩니다. 이미 시드가 완료된 Firebase에 다시 실행해도 기존 데이터를 덮어쓰므로 문제는 없지만, 관리자 계정 중복 생성 시 경고가 뜹니다.

### 비로그인 사용자

- 피드, 상품 상세, 검색 화면은 **로그인 없이** 열람 가능합니다.
- 장바구니 담기, 찜, 주문, 교환/반품은 **로그인이 필요**합니다. 비로그인 상태에서 시도하면 로그인 유도 바텀시트가 표시됩니다.

### Firestore 보안 규칙

- 개발 중에는 Firestore 보안 규칙을 테스트 모드(모든 읽기/쓰기 허용)로 두되, **프로덕션 배포 전에는 반드시 적절한 보안 규칙을 설정**해야 합니다.

### TossPayments

- 현재 테스트 모드로 구성되어 있습니다. 실제 결제가 이루어지지 않으며, 주문 데이터만 Firestore에 기록됩니다.

### 이미지

- 현재 상품/셀럽 이미지는 실제 파일이 아닌 **그라디언트 플레이스홀더**로 표시됩니다. Firebase Storage에 실제 이미지를 업로드하고 URL을 업데이트하면 실제 이미지가 보입니다.
