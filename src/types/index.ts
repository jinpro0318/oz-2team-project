export interface Celebrity {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  commissionRate: number;
  isActive: boolean;
  gradient: string;
  order?: number; // [효진] 노출 순서 (낮을수록 앞)
}




export interface Hotspot {
  id: string;
  productId: string;
  label: string;
  price: string;
  top: number;
  left: number;
  imageIndex?: number; // [효진] 여러 이미지 중 몇 번째 이미지의 핫스팟인지 구분 (0~2)
}


export interface Post {
  id: string;
  celebrityId: string;
  imageUrl: string; // 대표 이미지 (호환성 유지)
  imageUrls: string[]; // [효진] 착장 이미지 (최대 3장)
  caption: string;

  likes: number;
  comments: number;
  createdAt: string;
  hotspots: Hotspot[];
}

export interface ProductColor {
  name: string;
  imageUrl?: string; // [효진] 색상별 연결 이미지
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

export type ShippingAddress = Address; // [효진] 하위 호환성을 위해 추가


export interface User {
  id: string;
  email: string;
  nickname: string;
  phone: string;
  addresses: Address[];
  createdAt: string;
  role: "user" | "admin";
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
  | "exchange_requested"
  | "return_requested"
  | "returning"
  | "returned"
  | "exchange_completed"
  | "return_completed"
  | "purchase_confirmed"
  | "payment_pending"
  | "claim_rejected"; // [효진] 추가



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
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimeline[];
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

// [효진] 아래 타입들은 어드민 페이지(K2·K4·K7) 작업 시 신규 추가 (2026-04-29)

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
  order?: number; // [효진] 추가
}

