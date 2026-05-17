export interface Celebrity {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  commissionRate: number;
  isActive: boolean;
  gradient: string;
  order?: number;
}


export interface Hotspot {
  id: string;
  productId: string;
  label: string;
  price: string;
  top: number;
  left: number;
  imageIndex?: number;
}


export interface Post {
  id: string;
  celebrityId: string;
  imageUrl: string; // 대표 이미지 (호환성 유지)
  imageUrls: string[];
  caption: string;

  likes: number;
  comments: number;
  createdAt: string;
  hotspots: Hotspot[];
}

export interface ProductColor {
  name: string;
  imageUrl?: string;
}


export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  colors: ProductColor[];
  sizes: string[];
  description: string;
  specs: string;
  imageUrls: string[];
  celebrityId: string;
  salesCount: number;
  isVisible: boolean;
  category: string;
  stock: number; // [Master Map] 재고 필드 추가
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  isDefault: boolean;
}

export type ShippingAddress = Address;


export interface User {
  id: string;
  email: string;
  nickname: string;
  name?: string; // [v13.36] 실제 본명 필드 추가
  photoUrl?: string; // [v13.41] 프로필 사진 필드 추가
  phone: string;
  addresses: Address[];
  createdAt: string;
  role: "user" | "admin";
  points?: number;
  lastCheckedOrders?: string;
  lastCheckedWishlist?: string;
  isEmailProtected?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  color: string;
  size: string;
  quantity: number;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

export type OrderStatus =
  | "payment_complete"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "cancel_requested"
  | "exchange_requested"
  | "return_requested"
  | "returning"
  | "returned"
  | "exchange_completed"
  | "return_completed"
  | "purchase_confirmed"
  | "payment_pending"
  | "claim_rejected"
  | "inspecting"
  | "inspection_completed"
  | "exchange_preparing"
  | "reshipping";


export interface OrderItem {
  productId: string;
  product: Product;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  totalAmount: number;
  shippingFee: number;
  status: OrderStatus;
  carrierCode?: string;    // 택배사 코드
  trackingNumber?: string; // 운송장 번호
  carrierCodes?: string[];    // [NEW] 택배사 코드 목록
  trackingNumbers?: string[]; // [NEW] 운송장 번호 목록
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimeline[];
  
  // [Master Map] 취소/환불 관련 메타데이터 필드 공식화
  paymentKey?: string;
  cancelledAt?: string;
  refundAmount?: number;
  cancelReason?: string;
}

export interface OrderTimeline {
  status: string;
  label: string;
  date: string;
  description?: string;
}

export type ExchangeType = "exchange" | "return";

export interface Exchange {
  id: string;
  orderId: string;
  orderItemIndex: number;
  type: ExchangeType;
  reason: string;
  reasonDetail?: string;
  refundMethod?: string;
  refundAmount?: number;
  status: "requested" | "processing" | "completed";
  createdAt: string;
  ticketNumber: string;
}


/** 정산 상태 타입. "unpaid" = 미정산, "paid" = 정산완료 */
export type SettlementStatus = "unpaid" | "paid";

/**
 * 정산 내역 (Firestore "settlements" 컬렉션 문서 구조)
 * - K7 정산 관리 페이지에서 사용
 * - period: "YYYY-MM" 형식으로 정산 기간을 나타냄
 * - paidAt: 정산 완료 시 기록, 미정산이면 undefined
 */
export interface Settlement {
  id: string;
  celebrityId: string;
  celebName: string;
  period: string; // e.g., "2026-04"
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
  status: SettlementStatus;
  paidAt?: string;
  createdAt: string;
}

/**
 * 상품 등록/수정 폼 데이터 타입
 * - K2 상품 관리 페이지의 Modal + Form에서 사용
 * - Product 인터페이스와 거의 동일하지만 id는 포함하지 않음
 */
export interface ProductFormData {
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  colors: ProductColor[];
  sizes: string[];
  description: string;
  specs: string;
  imageUrls: string[];
  celebrityId: string;
  salesCount: number;
  isVisible: boolean;
  category: string;
}
/**
 * 셀럽 등록/수정 폼 데이터 타입
 * - K4 셀럽 관리 페이지의 Modal + Form에서 사용
 * - Celebrity 인터페이스와 거의 동일하지만 id는 포함하지 않음
 */
export interface CelebrityFormData {
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  commissionRate: number;
  isActive: boolean;
  gradient: string;
  order?: number;
}

// - description → content (마크다운 본문)
// - imageUrl → thumbnail (대표 이미지)
// - startDate/endDate → startAt/endAt (게시 기간)
// - productIds[], priority 신규 추가
export interface AppEvent {
  id: string;
  title: string;
  content: string;        // 본문 (마크다운/플레인 텍스트)
  thumbnail: string;      // 프로필 이미지 (메인 피드 EventCard 카드용)
  bannerImage: string;
  startAt: string;        // 게시 시작일 (ISO string)
  endAt: string;          // 게시 종료일 (ISO string)
  productIds: string[];   // 연결 상품 ID 목록
  isActive: boolean;      // 노출 여부
  priority: number;       // 노출 우선순위 (높을수록 상단)
}


export interface EventFormData {
  title: string;
  content: string;
  thumbnail: string;     // 프로필 이미지
  bannerImage: string;
  startAt: string;
  endAt: string;
  productIds: string[];
  isActive: boolean;
  priority: number;
}

