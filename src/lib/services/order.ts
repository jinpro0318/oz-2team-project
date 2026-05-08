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

      try {
        // [v9.1] 실시간 배송 조회는 참고용 데이터로만 활용합니다.
        // DB의 'status'를 덮어쓰는 행위는 '단일 진실의 샘' 원칙을 위반하므로 중단합니다.
        const trackResult = await deliveryService.track(order.carrierCode, order.trackingNumber, order.createdAt);
        // 더 이상 order.status를 덮어쓰지 않고 원본 order를 그대로 반환하거나 필요 정보만 추가합니다.
      } catch (e) {
        console.error(`[Delivery Track Error] Order ${order.id}:`, e);
      }
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

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  timelineEntry?: OrderTimeline,
  trackingNumber?: string,
  carrierCode?: string
): Promise<void> {
  console.log("[updateOrderStatus] Start Processing:", { id, status, trackingNumber, carrierCode });
  
  const order = await getDocument<Order>("orders", id);
  if (!order) return;

  const now = new Date().toISOString();
  let finalStatus = status;
  
  // [v9.1] 비즈니스 로직: 송장이 부여되었는데 '결제완료'라면 '준비중'으로 자동 격상
  if ((trackingNumber || order.trackingNumber) && finalStatus === "payment_complete") {
    finalStatus = "preparing";
  }

  // 1. 타임라인(이력) 관리 고도화
  const timeline = [...(order.timeline || [])];
  
  // 외부에서 명시적인 이력을 주지 않아도, 상태 변화에 따른 표준 이력 자동 생성
  if (!timelineEntry && order.status !== finalStatus) {
    const statusMessages: Record<string, string> = {
      preparing: "배송을 위해 상품 포장을 시작했습니다.",
      shipping: "상품이 택배사로 전달되어 배송이 시작되었습니다.",
      delivered: "배송이 완료되었습니다. 이용해 주셔서 감사합니다.",
      purchase_confirmed: "구매가 확정되었습니다. 즐거운 하루 되세요!",
      cancelled: "주문이 취소되었습니다.",
      exchange_requested: "교환 요청이 접수되었습니다.",
      return_requested: "반품 요청이 접수되었습니다.",
    };

    timeline.push({
      status: finalStatus,
      label: statusMessages[finalStatus] || `${finalStatus} 상태로 변경되었습니다.`,
      date: now,
      description: "시스템 자동 기록"
    });
  } else if (timelineEntry) {
    timeline.push(timelineEntry);
  }

  // 2. 송장 및 택배사 정보 (배열 및 단일 필드 동시 관리)
  const updateData: any = { 
    status: finalStatus, 
    timeline, 
    updatedAt: now 
  };

  if (trackingNumber !== undefined) {
    updateData.trackingNumber = trackingNumber;
    let tns = Array.isArray(order.trackingNumbers) ? [...order.trackingNumbers] : [];
    if (trackingNumber && !tns.includes(trackingNumber)) tns.push(trackingNumber);
    updateData.trackingNumbers = tns;
  }

  if (carrierCode !== undefined) {
    updateData.carrierCode = carrierCode;
    let ccs = Array.isArray(order.carrierCodes) ? [...order.carrierCodes] : [];
    if (carrierCode && !ccs.includes(carrierCode)) ccs.push(carrierCode);
    updateData.carrierCodes = ccs;
  }

  // 3. DB 업데이트 수행
  await updateDocument("orders", id, updateData);

  // 4. [핵심] 가상 배송 시뮬레이터(shipments) 연동 및 동기화
  const targetTN = trackingNumber || order.trackingNumber;
  const targetCC = carrierCode || order.carrierCode;

  if (targetTN && targetCC === "MOCK") {
    try {
      const isReturn = targetTN.startsWith("MOCK-R");
      
      // A. 배송 문서 자동 생성 (준비중 또는 출고 단계 진입 시)
      if (finalStatus === "preparing" || finalStatus === "shipping") {
        const existingShipment = await getDocument("shipments", targetTN);
        if (!existingShipment) {
          const type = targetTN.split('-')[1]?.[0] || 'S';
          const steps = type === 'R' ? 4 : 6;
          const initialStep = finalStatus === "shipping" ? 1 : 0; // 출고로 바로 넘어가면 1단계(배송중)로 시작
          
          const path = Array.from({ length: steps }).map((_, i) => ({
            label: `단계 ${i + 1}`,
            status: i === initialStep ? finalStatus : (i < initialStep ? "finished" : "pending"),
            location: i === 0 ? "판매처 창고" : (i === 1 ? "허브 터미널" : ""),
            timestamp: i <= initialStep ? now : ""
          }));

          await updateDocument("shipments", targetTN, {
            orderId: id,
            type,
            status: finalStatus,
            currentStep: initialStep,
            path,
            createdAt: now,
            updatedAt: now
          });
          console.log(`[updateOrderStatus] MOCK Shipment Auto-Created (${finalStatus}): ${targetTN}`);
        }
      }

      // B. 출고(shipping) 단계 진입 시: 시뮬레이터 바늘을 [배송중]으로 전진
      if (finalStatus === "shipping") {
        const isReturn = targetTN.startsWith("MOCK-R");
        const shippingStep = 1; // S, R, E 공통적으로 1번 인덱스가 본격적인 배송/수거 시작 단계
        
        await updateDocument("shipments", targetTN, {
          currentStep: shippingStep,
          status: "shipping",
          updatedAt: now
        });
        console.log(`[updateOrderStatus] MOCK Shipment synced to shipping step: ${targetTN}`);
      }

      // C. 배송 완료/구매 확정 시: 시뮬레이션 강제 종료 (도트 정렬)
      if (finalStatus === "delivered" || finalStatus === "purchase_confirmed") {
        const lastStep = isReturn ? 3 : 5;
        await updateDocument("shipments", targetTN, {
          currentStep: lastStep,
          status: isReturn ? "returned" : "delivered",
          updatedAt: now,
          deliveredAt: now
        });
        console.log(`[updateOrderStatus] MOCK Shipment synced to final step: ${targetTN}`);
      }
    } catch (err) {
      console.warn("[updateOrderStatus] MOCK Sync Warning:", err);
    }
  }
}
