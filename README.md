# C.O.D.E. — Celebrity Outfit Daily Edition

셀럽의 데일리 착장을 발견하고 바로 구매할 수 있는 패션 커머스 플랫폼 MVP입니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + Ant Design 5
- **State**: Zustand (클라이언트) + TanStack Query (서버)
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Payment**: TossPayments SDK (테스트 모드)
- **Deploy**: Vercel

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

개발 서버: http://localhost:3000

## 환경 변수 설정

`.env.local` 파일에 Firebase 및 TossPayments 키를 설정하세요:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...
```

## 주요 라우트

### 모바일 (390px 기준)

| 경로 | 화면 | 설명 |
|---|---|---|
| `/feed` | 메인 피드 | 셀럽별 인스타 스타일 피드 + 핫스팟 |
| `/login` | 로그인 | 이메일/비밀번호 |
| `/register` | 회원가입 | 2단계 폼 |
| `/search` | 검색 | 셀럽/상품 통합 검색 |
| `/product/[id]` | 상품 상세 | 색상/사이즈 선택, 장바구니/구매 |
| `/cart` | 장바구니 | 수량 조절, 결제 진행 |
| `/checkout` | 결제 | 배송지 + 결제 수단 |
| `/order-complete` | 결제 완료 | 주문 확인 |
| `/orders` | 주문 내역 | 상태별 필터 |
| `/orders/[id]` | 주문 상세 | 배송 추적 + 타임라인 |
| `/exchange/[orderId]` | 교환/반품 | 사유 선택 + 신청 |
| `/wishlist` | 찜 목록 | 그리드 레이아웃 |
| `/mypage` | 마이페이지 | 프로필 + 메뉴 |
| `/mypage/profile` | 프로필 편집 | 닉네임/연락처 + 계정 탈퇴 |
| `/mypage/password` | 비밀번호 변경 | 강도 표시 |
| `/mypage/support` | 고객센터 | 전화 + FAQ |

### 어드민 (데스크톱 1280px+)

| 경로 | 화면 |
|---|---|
| `/admin` | 대시보드 |
| `/admin/products` | 상품 관리 |
| `/admin/orders` | 주문 관리 |
| `/admin/celebrities` | 셀럽 관리 |
| `/admin/analytics` | 매출 분석 |
| `/admin/settlements` | 정산 관리 |
