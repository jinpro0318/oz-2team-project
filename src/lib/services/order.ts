import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  where,
  orderBy,
  limit,
  subscribeDocument,
  subscribeDocuments,
} from "@/lib/firestore";

import type { Order, OrderStatus, OrderItem, Address, OrderTimeline } from "@/types";
import { LogisticsMasterService } from "./LogisticsMasterService";
import { getShipmentTypeFromTracking } from "./logistics";
import { LogisticsStatusResolver } from "./LogisticsStatusResolver";
import { Timestamp } from "firebase/firestore";

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  totalAmount: number;
  shippingFee: number;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const now = new Date().toISOString();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const timeline: OrderTimeline[] = [
    {
      status: "payment_pending",
      label: "결제 대기",
      date: now,
      description: "결제 진행 중입니다",
    },
  ];

  const expireDate = new Date();
  expireDate.setMinutes(expireDate.getMinutes() + 60);

  const orderData = {
    orderNumber,
    userId: input.userId,
    items: input.items,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    totalAmount: input.totalAmount,
    shippingFee: input.shippingFee,
    status: "payment_pending" as OrderStatus,
    carrierCode: "",
    trackingNumber: "",
    updatedAt: now,
    timeline,
    // [보안/무결성] 실시간 하트비트 및 60분 자동 폭파(TTL) 필드 추가
    lastActive: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expireDate),
    pendingSessionId: `sess_${Date.now()}`,
  };

  const id = await createDocument("orders", orderData);
  return { id, ...orderData, createdAt: now } as Order;
}

import { deliveryService } from "./delivery";

/**
 * [원샷] 주문 데이터에 실시간 배송 상태를 미리 입혀서 반환합니다.
 * 사용자님이 제안하신 "최초 렌더링 시점에 데이터를 넣어버리는" 핵심 로직입니다.
 */
async function enrichOrdersWithRealtimeStatus(orders: Order[]): Promise<Order[]> {
  const enrichedOrders = await Promise.all(
    orders.map(async (order) => {
      // [보호 로직] 아래 상태들은 사용자의 액션이나 클레임 절차가 우선이므로 실시간 조회를 하지 않음
      const isProtectedStatus = [
        "purchase_confirmed", "cancelled", 
        "return_requested", "exchange_requested", 
        "returning", "returned", 
        "return_completed", "exchange_completed", 
        "claim_rejected"
      ].includes(order.status);

      if (isProtectedStatus || !order.carrierCode || !order.trackingNumber) {
        return order;
      }

      /* [v9.1] 현재는 DB의 status가 단일 진실의 샘(SSOT)이므로, 
         목록 조회 시마다 수백 건의 외부 조회를 수행할 필요가 없어 비활성화합니다. 
      try {
        await deliveryService.track(order.carrierCode, order.trackingNumber, order.createdAt);
      } catch (e) {
        console.error(`[Delivery Track Error] Order ${order.id}:`, e);
      } */
      return order;
    })
  );
  return enrichedOrders;
}

export async function getOrders(userId: string): Promise<Order[]> {
  const docs = await getDocuments<Order>("orders", [
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50),
  ]);
  
  // 실시간 배송 상태를 미리 조회하여 합침 (최초 렌더링용)
  return enrichOrdersWithRealtimeStatus(docs);
}

export function subscribeOrders(userId: string, onUpdate: (orders: Order[]) => void) {
  return subscribeDocuments<Order>(
    "orders",
    [
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50),
    ],
    async (docs) => {
      // 데이터가 바뀌면 실시간 상태를 다시 입혀서 업데이트 (이중 출력 방지)
      const enriched = await enrichOrdersWithRealtimeStatus(docs);
      onUpdate(enriched);
    }
  );
}

export function subscribeOrder(id: string, onUpdate: (order: Order | null) => void) {
  return subscribeDocument<Order>("orders", id, onUpdate);
}

const PAID_STATUSES: OrderStatus[] = [
  "payment_complete", "preparing", "shipping", "delivered", 
  "cancelled", "exchange_requested", "return_requested", 
  "returning", "returned", "exchange_completed", 
  "return_completed", "purchase_confirmed", "claim_rejected"
];



export async function getAllOrders(): Promise<Order[]> {
  const docs = await getDocuments<Order>("orders", [
    where("status", "in", PAID_STATUSES),
    orderBy("createdAt", "desc"),
    limit(300),
  ]);
  return enrichOrdersWithRealtimeStatus(docs);
}

export async function getAllOrdersForAnalytics(): Promise<Order[]> {
  const docs = await getDocuments<Order>("orders", [
    where("status", "in", PAID_STATUSES),
    orderBy("createdAt", "desc"),
    limit(1000), 
  ]);
  return docs;
}







export function subscribeAllOrders(onUpdate: (orders: Order[]) => void) {
  return subscribeDocuments<Order>(
    "orders",
    [
      where("status", "in", PAID_STATUSES),
      orderBy("createdAt", "desc"),
      limit(300),
    ],
    async (docs) => {
      const enriched = await enrichOrdersWithRealtimeStatus(docs);
      onUpdate(enriched);
    }





  );
}


export async function getOrder(id: string): Promise<Order | null> {
  const order = await getDocument<Order>("orders", id);
  if (!order) return null;
  
  // 단일 주문도 실시간 상태를 미리 입혀서 반환
  const enriched = await enrichOrdersWithRealtimeStatus([order]);
  return enriched[0];
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const docs = await getDocuments<Order>("orders", [where("orderNumber", "==", orderNumber)]);
  return docs[0] || null;
}


