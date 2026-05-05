import { Order, OrderStatus } from "@/types";

/**
 * 주문이 최종 종료된 상태인지 확인합니다.
 */
export const isFinishedStatus = (status: OrderStatus): boolean => {
  return ["purchase_confirmed", "cancelled", "return_completed"].includes(status);

};

/**
 * 주문의 타임라인을 분석하여 가장 최근의 클레임(교환/반품) 유형을 반환합니다.
 */
export const getActiveClaimType = (order: Order): "exchange" | "return" | null => {
  if (!order.timeline) return null;
  
  const lastClaim = [...order.timeline]
    .reverse()
    .find(t => ["exchange_requested", "return_requested"].includes(t.status));
    
  if (!lastClaim) return null;
  return lastClaim.status === "exchange_requested" ? "exchange" : "return";
};

/**
 * 현재 주문이 클레임(교환/반품) 진행 중인지 확인합니다.
 */
export const isClaimInProgress = (order: Order): boolean => {
  const claimType = getActiveClaimType(order);
  return !!claimType && !isFinishedStatus(order.status);
};

/**
 * 상태별 송장번호 끝자리 시뮬레이션 규칙 (CODE 로지스틱스 전용)
 */
export const getCodeLogisticsTrackingNumber = (currentNumber: string | undefined, status: OrderStatus): string => {
  const base = currentNumber?.length && currentNumber.length > 5 
    ? currentNumber.slice(0, -1) 
    : "MOCK940000000";

  switch (status) {
    case "delivered":
    case "exchange_completed":
    case "purchase_confirmed":
      return base + "5";
    case "returning":
    case "returned":
    case "return_completed":
      return base + "6";
    case "shipping":
      return base + "3";
    case "preparing":
      return base + "2";
    default:
      return currentNumber || base + "1";
  }
};
