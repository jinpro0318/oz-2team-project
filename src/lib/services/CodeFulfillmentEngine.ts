import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import {
  LogisticsStatusResolver,
  OrderActionIntent,
} from "./LogisticsStatusResolver";

export class CodeFulfillmentEngine {
  /**
   * 프론트엔드의 의도(Intent)를 받아 정책 모듈을 거쳐 DB를 원자적으로 동기화합니다.
   * [중요] Firestore 트랜잭션 규칙: 모든 READ는 모든 WRITE보다 먼저 수행되어야 함.
   */
  static async executeAction(
    orderId: string,
    intent: OrderActionIntent,
    extraData?: { trackingNumber?: string; carrierCode?: string },
  ): Promise<void> {
    if (!orderId || !intent)
      throw new Error("orderId와 intent는 필수 파라미터입니다.");

    // [v10.9] 트랜잭션 속도 최적화: 동적 임포트를 밖으로 뺌
    const { generateMOCKTrackingNumber } = await import("@/lib/utils/order");
    const { createMockShipment } = await import("./logistics");

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
      const trackingNumber =
        extraData?.trackingNumber || orderData.trackingNumber || "";
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

      // [v12.5] 전역 설정에서 쇼핑몰 출발지 주소 로드 (반드시 모든 Write 전에 수행되어야 함)
      let senderAddress = "경기도 고양시 일산동구";
      try {
        const settingsRef = doc(db, "settings", "system");
        const settingsSnap = await transaction.get(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().mallAddress) {
          senderAddress = settingsSnap.data().mallAddress;
        }
      } catch (e) {
        console.error("발송지 로드 실패, 기본값 사용:", e);
      }

      // --- [STAGE 2: LOGIC] 비즈니스 로직 처리 ---

      // 배송 타입 결정 (S: 일반, R: 반품, EQ: 교환수거, ES: 교환재배송)
      // [수정] 주문 상태(Context) 및 claimType을 최우선으로 판단하여 올바른 라벨을 유지합니다.
      let shipmentType: "S" | "R" | "EQ" | "ES" = "S";
      const dbClaimType = shipmentSnap?.exists() ? shipmentSnap.data().claimType : orderData.claimType;

      if (dbClaimType?.includes("exchange") || orderData.status.includes("exchange")) {
        if (trackingNumber.startsWith("MOCK-ES")) shipmentType = "ES";
        else shipmentType = "EQ";
      } else if (dbClaimType?.includes("return") || orderData.status.includes("return")) {
        shipmentType = "R";
      } else if (trackingNumber.startsWith("MOCK-EQ")) {
        shipmentType = "EQ";
      } else if (trackingNumber.startsWith("MOCK-ES")) {
        shipmentType = "ES";
      } else if (trackingNumber.startsWith("MOCK-R")) {
        shipmentType = "R";
      }

      // 정책 모듈에 해석 의뢰
      const resolved = LogisticsStatusResolver.resolveAction(
        intent,
        currentStep,
        shipmentType,
      );

      // --- [v11.8] 물류 삭제 특별 분기 (Early Return) ---
      if (intent === "DELETE_LOGISTICS") {
        const resetUpdates: any = { 
          updatedAt: new Date().toISOString(),
          carrierCode: "",
          trackingNumber: ""
        };

        const timeline = orderData.timeline || [];
        timeline.push({
          status: orderData.status,
          label: "배송 정보 초기화",
          date: new Date().toISOString(),
          description: "시스템 의도(DELETE_LOGISTICS)에 의한 초기화 및 배송 문서 파기",
        });
        resetUpdates.timeline = timeline;

        if (shipmentRef) {
          transaction.delete(shipmentRef);
          console.log(`[CodeFulfillmentEngine] 기존 배송 문서(${trackingNumber}) 물리적 파기 완료`);
        }

        transaction.update(orderRef, resetUpdates);
        return;
      }

      // --- [STAGE 3: WRITES] 모든 쓰기 작업을 마지막에 수행 ---
      
      // 3. 주문(orders) 컬렉션 업데이트 준비
      const orderUpdates: any = { updatedAt: new Date().toISOString() };

      // [v10.5 No-Trick] 정책 모듈의 지시(requiresNewShipment)에 따라 송장 교체 여부 결정
      let finalTrackingNumber = trackingNumber;
      let finalShipmentRef = shipmentRef;
      let finalIsNewShipment = !shipmentSnap || !shipmentSnap.exists();

      if (
        resolved.requiresNewShipment &&
        resolved.requiresNewShipment !== "none"
      ) {
        // [수정] 무한 루프를 위해, 기존 송장 접두어 방어 로직 제거. (새 송장 지시가 오면 무조건 발급)
        finalTrackingNumber = generateMOCKTrackingNumber(resolved.requiresNewShipment);
        orderUpdates.trackingNumber = finalTrackingNumber;
        
        // [v10.6] 송장 교체 시 타입과 이력 배열도 즉시 동기화
        shipmentType = resolved.requiresNewShipment; 
        const oldHistory = Array.isArray(orderData.trackingNumbers) ? orderData.trackingNumbers : (orderData.trackingNumber ? [orderData.trackingNumber] : []);
        if (!oldHistory.includes(finalTrackingNumber)) {
          orderUpdates.trackingNumbers = [...oldHistory, finalTrackingNumber];
        }

        finalShipmentRef = doc(db, "shipments", finalTrackingNumber);
        finalIsNewShipment = true; 
        console.log(
          `[CodeFulfillmentEngine] 정책 모듈 지시에 의한 송장 교체: ${trackingNumber} -> ${finalTrackingNumber} (Type: ${shipmentType})`,
        );
      }

      // [v11.11] 송장 수동/자동 부여 처리 (UI에서 엔진으로 이관)
      if (intent === "ASSIGN_TRACKING") {
        if (extraData?.carrierCode === "MOCK") {
          finalTrackingNumber = generateMOCKTrackingNumber(shipmentType);
          orderUpdates.carrierCode = "MOCK";
          orderUpdates.trackingNumber = finalTrackingNumber;
          finalShipmentRef = doc(db, "shipments", finalTrackingNumber);
          finalIsNewShipment = true;
          console.log(`[CodeFulfillmentEngine] 시뮬레이션 송장 자동 발급: ${finalTrackingNumber}`);
        } else if (extraData?.trackingNumber) {
          finalTrackingNumber = extraData.trackingNumber;
          orderUpdates.carrierCode = extraData.carrierCode || carrierCode;
          orderUpdates.trackingNumber = finalTrackingNumber;
          finalShipmentRef = doc(db, "shipments", finalTrackingNumber);
          finalIsNewShipment = finalTrackingNumber !== trackingNumber;
        }
        
        // 배송 문서를 즉시 생성하기 위해, 현재 주문 상태에 맞는 단계를 할당합니다.
        if (resolved.step === undefined) {
          resolved.step = LogisticsStatusResolver.getTargetIndex(orderData.status, shipmentType);
        }
      } else {
        // 기존의 extraData 처리 로직 보존
        if (extraData?.trackingNumber && !orderUpdates.trackingNumber) {
          orderUpdates.trackingNumber = extraData.trackingNumber;
        }
        if (extraData?.carrierCode && !orderUpdates.carrierCode) {
          orderUpdates.carrierCode = extraData.carrierCode;
        }
      }

      if (resolved.status) {
        orderUpdates.status = resolved.status as OrderStatus;
        
        // [v11.1] 송장이 없는 0단계 등에서도 UI가 단계를 추적할 수 있도록 
        // 주문서 자체에 currentStep을 명시적으로 각인합니다.
        if (resolved.step !== undefined) {
          orderUpdates.currentStep = resolved.step;
        }

        // 타임라인 추가
        const timeline = orderData.timeline || [];
        const isNew = finalTrackingNumber !== trackingNumber;
        timeline.push({
          status: resolved.status,
          label: this.getLabelForStatus(resolved.status),
          date: new Date().toISOString(),
          description: `시스템 의도(${intent})에 의한 자동 업데이트${isNew ? ` (교환용 새 송장 발급: ${finalTrackingNumber})` : ""}`,
        });
        orderUpdates.timeline = timeline;
      }

      transaction.update(orderRef, orderUpdates);

      // 4. 배송(shipments) 컬렉션 업데이트
      if (
        resolved.shouldUpdateShipment &&
        finalShipmentRef &&
        resolved.step !== undefined
      ) {
        const shipmentStatus =
          LogisticsStatusResolver.getShipmentStatusForIndex(
            resolved.step,
            shipmentType,
          );

        const shipmentData: any = {
          currentStep: resolved.step,
          status: shipmentStatus,
          updatedAt: serverTimestamp(),
        };

        if (finalIsNewShipment) {
          shipmentData.orderId = orderData.orderNumber;
          shipmentData.carrierCode = carrierCode;
          shipmentData.trackingNumber = finalTrackingNumber;
          shipmentData.createdAt = serverTimestamp();
          
          // [v10.7] 이전 송장(MOCK-R 등)의 과거 기억(Path Timestamp)을 새 송장에 이식
          const oldPath = shipmentSnap?.exists() ? shipmentSnap.data().path : [];

          const mockShipment = await createMockShipment({
            trackingNumber: finalTrackingNumber,
            carrierCode,
            orderId: orderId,
            senderAddress,
            receiverAddress: orderData.shippingAddress.address,
            targetStep: resolved.step!, // 👈 [v11.10] 정책 모듈이 하달한 단계를 직접 주입
            shipmentType: shipmentType, // 👈 [수정] 결정된 배송 타입을 명시적으로 전달
          });

          // 과거 단계의 시간을 현재 시각 혹은 이전 기록으로 채움 (연속성 확보)
          const nowMs = Date.now();
          const nowIso = new Date(nowMs).toISOString();
          shipmentData.path = mockShipment.path.map((p: any, idx: number) => {
            if (idx < resolved.step!) {
              const pastMs = nowMs - ((resolved.step! - idx) * 5 * 60000); // 5분씩 과거로 소급
              return { ...p, estimatedTime: oldPath[idx]?.estimatedTime || new Date(pastMs).toISOString() };
            }
            if (idx === resolved.step) {
              return { ...p, estimatedTime: nowIso };
            }
            return p;
          });

          shipmentData.type = mockShipment.type;
          shipmentData.currentStep = resolved.step; // 정책 모듈의 지시를 따름
          shipmentData.status = shipmentStatus;
        }

        if (
          shipmentStatus === "delivered" ||
          shipmentStatus === "returned" ||
          shipmentStatus === "exchange_completed"
        ) {
          shipmentData.deliveredAt = serverTimestamp();
        }

        transaction.set(finalShipmentRef, shipmentData, { merge: true });

        // 5. 배송 상세 로그 남기기
        const statusToKorean = (s: string) => {
          switch (s) {
            case "payment_complete": return "결제완료";
            case "preparing": return "상품준비중";
            case "shipping": return "배송중";
            case "delivered": return "배송완료";
            case "returning": return "수거중";
            case "returned": return "수거완료";
            case "reshipping": return "교환배송";
            case "exchange_completed": return "배송완료";
            case "purchase_confirmed": return "구매확정";
            default: return s;
          }
        };

        const koreanStatus = statusToKorean(shipmentStatus);
        const shipmentTypeName = shipmentType === "S" ? "일반 발송" : shipmentType === "R" ? "반품 회수" : (shipmentType === "EQ" ? "교환 수거" : "교환품 발송");

        const logRef = doc(
          collection(finalShipmentRef, "logs"),
          `step-${resolved.step}-${Date.now()}`,
        );

        transaction.set(logRef, {
          logId: `step-${resolved.step}`,
          status: koreanStatus,
          location: "DIAMOND 물류 엔진",
          message: finalIsNewShipment
            ? `신규 배송 세션(${shipmentType} - ${shipmentTypeName})이 시작되었습니다.`
            : `관리자/시스템(${intent})에 의해 배송 상태가 [${koreanStatus}](으)로 업데이트 되었습니다.`,
          timestamp: serverTimestamp(),
          isSystem: true,
        });
      }
    });

    console.log(
      `[CodeFulfillmentEngine] 주문(${orderId})의 ${intent} 명령 처리가 완벽히 동기화되었습니다.`,
    );
  }

  private static getLabelForStatus(status: string): string {
    const map: Record<string, string> = {
      preparing: "상품 준비중",
      shipping: "배송중",
      delivered: "배송 완료",
      returning: "반품 수거중",
      returned: "반품 수거완료",
      inspecting: "상품 검수중",
      reshipping: "교환품 재발송",
      exchange_completed: "교환 완료",
      claim_rejected: "클레임 반려",
      purchase_confirmed: "구매 확정",
    };
    return map[status] || "상태 변경";
  }
}
