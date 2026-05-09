import { doc, runTransaction, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import { LogisticsStatusResolver, OrderActionIntent } from "./LogisticsStatusResolver";

export class CodeFulfillmentEngine {
  /**
   * 프론트엔드의 의도(Intent)를 받아 정책 모듈을 거쳐 DB를 원자적으로 동기화합니다.
   * [중요] Firestore 트랜잭션 규칙: 모든 READ는 모든 WRITE보다 먼저 수행되어야 함.
   */
  static async executeAction(orderId: string, intent: OrderActionIntent, extraData?: { trackingNumber?: string; carrierCode?: string }): Promise<void> {
    if (!orderId || !intent) throw new Error("orderId와 intent는 필수 파라미터입니다.");

    const orderRef = doc(db, "orders", orderId);

    await runTransaction(db, async (transaction) => {
      // --- [STAGE 1: READS] 모든 읽기 작업을 먼저 수행 ---
      
      // 1. 주문 데이터 조회
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`주문(${orderId}) 데이터를 찾을 수 없습니다.`);
      }
      const orderData = orderSnap.data() as Order;

      // 새 송장번호 결정
      const trackingNumber = extraData?.trackingNumber || orderData.trackingNumber || "";
      const carrierCode = extraData?.carrierCode || orderData.carrierCode || "";

      // 2. 배송 데이터 조회
      let currentStep = 0;
      let shipmentSnap: any = null;
      let shipmentRef = null;

      if (trackingNumber) {
        shipmentRef = doc(db, "shipments", trackingNumber);
        shipmentSnap = await transaction.get(shipmentRef);
        if (shipmentSnap.exists()) {
          currentStep = shipmentSnap.data().currentStep ?? 0;
        }
      }

      // --- [STAGE 2: LOGIC] 비즈니스 로직 처리 ---

      // 배송 타입 결정 (S: 일반, R: 반품, E: 교환)
      let shipmentType: "S" | "R" | "E" = "S";
      if (trackingNumber.startsWith("MOCK-R")) shipmentType = "R";
      else if (trackingNumber.startsWith("MOCK-E")) shipmentType = "E";
      else if (orderData.status.includes("return")) shipmentType = "R";
      else if (orderData.status.includes("exchange")) shipmentType = "E";

      // 정책 모듈에 해석 의뢰
      const resolved = LogisticsStatusResolver.resolveAction(intent, currentStep, shipmentType);

      // --- [STAGE 3: WRITES] 모든 쓰기 작업을 마지막에 수행 ---

      // 3. 주문(orders) 컬렉션 업데이트 준비
      const orderUpdates: any = { updatedAt: new Date().toISOString() };
      if (extraData?.trackingNumber) orderUpdates.trackingNumber = extraData.trackingNumber;
      if (extraData?.carrierCode) orderUpdates.carrierCode = extraData.carrierCode;
      
      if (resolved.status) {
        orderUpdates.status = resolved.status as OrderStatus;
        
        // 타임라인 추가
        const timeline = orderData.timeline || [];
        timeline.push({
          status: resolved.status,
          label: this.getLabelForStatus(resolved.status),
          date: new Date().toISOString(),
          description: `시스템 의도(${intent})에 의한 자동 업데이트`
        });
        orderUpdates.timeline = timeline;
      }
      
      transaction.update(orderRef, orderUpdates);

      // 4. 배송(shipments) 컬렉션 업데이트
      if (resolved.shouldUpdateShipment && shipmentRef && resolved.step !== undefined) {
        const shipmentStatus = LogisticsStatusResolver.getShipmentStatusForIndex(resolved.step, shipmentType);
        const isNewShipment = !shipmentSnap || !shipmentSnap.exists();

        const shipmentData: any = {
          currentStep: resolved.step,
          status: shipmentStatus,
          updatedAt: serverTimestamp()
        };
        
        if (isNewShipment) {
          shipmentData.orderId = orderData.orderNumber;
          shipmentData.carrierCode = carrierCode;
          shipmentData.trackingNumber = trackingNumber;
          shipmentData.createdAt = serverTimestamp();
          shipmentData.path = LogisticsStatusResolver.getUISteps(shipmentType).map((s, idx) => ({
            location: idx === 0 ? "접수지" : "지역 터미널",
            status: s.title,
            statusLabel: s.title,
            message: idx === 0 ? "클레임 접수 및 수거 대기" : "배송 처리 중",
            estimatedTime: new Date().toISOString()
          }));
        }

        if (shipmentStatus === "delivered" || shipmentStatus === "returned" || shipmentStatus === "exchange_completed") {
            shipmentData.deliveredAt = serverTimestamp();
        }

        transaction.set(shipmentRef, shipmentData, { merge: true });

        // 5. 배송 상세 로그 남기기
        const logRef = doc(collection(shipmentRef, "logs"), `step-${resolved.step}-${Date.now()}`);
        transaction.set(logRef, {
          logId: `step-${resolved.step}`,
          status: shipmentStatus,
          location: "CodeFulfillmentEngine",
          message: isNewShipment 
            ? `신규 배송 세션(${shipmentType})이 시작되었습니다.`
            : `관리자/시스템(${intent})에 의해 배송 상태가 [${shipmentStatus}](으)로 업데이트 되었습니다.`,
          timestamp: serverTimestamp(),
          isSystem: true
        });
      }
    });

    console.log(`[CodeFulfillmentEngine] 주문(${orderId})의 ${intent} 명령 처리가 완벽히 동기화되었습니다.`);
  }

  private static getLabelForStatus(status: string): string {
    const map: Record<string, string> = {
      preparing: "상품 준비중",
      shipping: "배송중",
      delivered: "배송 완료",
      returning: "반품 수거중",
      returned: "반품 수거완료",
      reshipping: "교환품 재발송",
      exchange_completed: "교환 완료",
      claim_rejected: "클레임 반려"
    };
    return map[status] || "상태 변경";
  }
}
