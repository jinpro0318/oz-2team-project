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
 * ──────────────────────────────────────────────────────────────
 * [v9.0 §7] 통합 스마트 송장 엔진 (Smart Tracking Engine)
 * ──────────────────────────────────────────────────────────────
 * 포맷: MOCK-{Type}{YYMMDD}-{Random4}
 *
 * @param type - 'S' (Standard 최초출고) | 'R' (Return 반품수거) | 'E' (Exchange 교환재배송)
 * @returns 고유한 MOCK 송장 번호 (예: MOCK-S260507-A1B2)
 */
export type MOCKShipmentType = 'S' | 'R' | 'E';

export const generateMOCKTrackingNumber = (type: MOCKShipmentType): string => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  // 4자리 영숫자 랜덤 (충돌 가능성 극히 낮음)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `MOCK-${type}${datePart}-${random}`;
};
