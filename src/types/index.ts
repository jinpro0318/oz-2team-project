export interface Celebrity {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  commissionRate: number;
  isActive: boolean;
  gradient: string;
}

export interface Hotspot {
  id: string;
  productId: string;
  label: string;
  price: string;
  top: number;
  left: number;
}

export interface Post {
  id: string;
  celebrityId: string;
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  createdAt: string;
  hotspots: Hotspot[];
}

export interface ProductColor {
  name: string;
  hex: string;
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
  specs: Record<string, string>;
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

export interface User {
  id: string;
  email: string;
  nickname: string;
  phone: string;
  addresses: Address[];
  createdAt: string;
  role: "user" | "admin";
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
  | "return_requested";

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
