import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Shipment,
  PathStep,
  getShipmentTypeFromTracking,
  MOCK_STANDARD_PATH,
  MOCK_RETURN_PATH,
} from "./logistics";

/**
 * [LogisticsMasterService]
 * 시스템의 유일한 배송 제어 타워 (v10.1 다이아몬드 하이브리드 아키텍처 적용)
 */
export class LogisticsMasterService {
  private static SHIPMENTS_COL = "shipments";

  /**
   * 1. 신규 배송 문서 생성 (하이브리드 동시 쓰기)
   * 요약본은 shipments 컬렉션에, 상세 내역(첫 단계)은 logs 서브컬렉션에 원자적(Atomic)으로 저장합니다.
   */
  static async createShipment(params: {
    trackingNumber: string;
    carrierCode: string;
    orderId: string;
    senderAddress?: string;
    receiverAddress?: string;
    buyerId?: string;
    sellerId?: string;
  }): Promise<void> {
    const type = getShipmentTypeFromTracking(params.trackingNumber);
    const { MOCK_EXCHANGE_PICKUP_PATH, MOCK_EXCHANGE_RESHIP_PATH } =
      await import("./logistics");

    let basePath = MOCK_STANDARD_PATH;
    if (type === "R") basePath = MOCK_RETURN_PATH;
    if (type === "EQ") basePath = MOCK_EXCHANGE_PICKUP_PATH;
    if (type === "ES") basePath = MOCK_EXCHANGE_RESHIP_PATH;

    const now = new Date();
    const batch = writeBatch(db);
    const shipmentRef = doc(db, this.SHIPMENTS_COL, params.trackingNumber);

    // [Layer 1] Summary (path 배열)
    const path: PathStep[] = basePath.map((p, idx) => ({
      ...p,
      estimatedTime: idx === 0 ? now.toISOString() : "",
    }));

    const shipmentData: any = {
      shipmentId: params.trackingNumber,
      orderId: params.orderId,
      buyerId: params.buyerId || "",
      sellerId: params.sellerId || "system",
      carrierCode: params.carrierCode,
      trackingNumber: params.trackingNumber,
      status:
        type === "S"
          ? "shipping"
          : type === "R"
            ? "returning"
            : "exchange_preparing",
      type,
      currentStep: 0,
      path,
      senderAddress: params.senderAddress || "",
      receiverAddress: params.receiverAddress || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (params.carrierCode === "MOCK") {
      shipmentData.nextUpdateAt = serverTimestamp(); // 시뮬레이션용 스케줄링
    } else {
      shipmentData.lastSyncedAt = serverTimestamp(); // 리얼 송장용 캐시 기준점
    }

    batch.set(shipmentRef, shipmentData);

    // [Layer 2] Detail Logs (logs 서브컬렉션)
    const firstLogRef = doc(collection(shipmentRef, "logs"), "step-0");
    batch.set(firstLogRef, {
      logId: "step-0",
      status: basePath[0].status,
      location: basePath[0].location,
      message: basePath[0].message,
      timestamp: serverTimestamp(),
      isSystem: true,
    });

    await batch.commit();
    console.log(
      `[LogisticsMasterService] 하이브리드 배송 문서 생성 완료: ${params.trackingNumber}`,
    );
  }

  /**
   * 2. 외부 API 동기화 및 하이브리드 저장
   */
  static async syncExternalDelivery(params: {
    trackingNumber: string;
    orderId: string;
    carrierCode: string;
    status: string;
    history: any[];
  }): Promise<void> {
    const batch = writeBatch(db);
    const shipmentRef = doc(db, this.SHIPMENTS_COL, params.trackingNumber);

    // [Layer 1] Summary 업데이트 (실무에서는 이 중 5~8개 핵심 이벤트만 필터링 필요)
    const path: PathStep[] = params.history.map((h: any) => ({
      location: h.location || "",
      status: h.status || "",
      statusLabel: h.status || "",
      message: h.description || "",
      estimatedTime: h.time ? new Date(h.time).toISOString() : "",
    }));

    batch.set(
      shipmentRef,
      {
        status: params.status,
        carrierCode: params.carrierCode,
        trackingNumber: params.trackingNumber,
        path: path,
        lastSyncedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    // [Layer 2] Detail 업데이트 (모든 원본 로깅 무제한 저장)
    params.history.forEach((h: any, index: number) => {
      const logRef = doc(collection(shipmentRef, "logs"), `step-${index}`);
      batch.set(
        logRef,
        {
          logId: `step-${index}`,
          status: h.status || "",
          location: h.location || "",
          message: h.description || "",
          timestamp: h.time ? new Date(h.time) : serverTimestamp(),
          isSystem: true,
        },
        { merge: true },
      );
    });

    await batch.commit();
    console.log(
      `[LogisticsMasterService] 외부 API 동기화 하이브리드 저장 완료: ${params.trackingNumber}`,
    );
  }

  /**
   * 3. 배송 상태 전진 (Transaction 및 다중 레이어 업데이트 강제)
   */
  static async advanceStatus(
    trackingNumber: string,
    orderId: string,
    newStep: number,
    finalStatus: string,
  ): Promise<void> {
    const batch = writeBatch(db);
    const shipmentRef = doc(db, this.SHIPMENTS_COL, trackingNumber);

    // 배송 정보 갱신
    const updateData: any = {
      currentStep: newStep,
      status: finalStatus,
      updatedAt: serverTimestamp(),
    };
    if (finalStatus === "delivered" || finalStatus === "returned") {
      updateData.deliveredAt = serverTimestamp();
    }
    batch.update(shipmentRef, updateData);

    // 상태 전진 시에도 상세 로그 무조건 남김
    const logRef = doc(
      collection(shipmentRef, "logs"),
      `step-${newStep}-${Date.now()}`,
    );
    batch.set(logRef, {
      logId: `step-${newStep}`,
      status: finalStatus,
      location: "시스템 스케줄러/어드민",
      message: `배송 상태가 [${finalStatus}](으)로 업데이트 되었습니다.`,
      timestamp: serverTimestamp(),
      isSystem: true,
    });

    await batch.commit();
    console.log(
      `[LogisticsMasterService] 배송 상태 전진 완료 (${finalStatus}): ${trackingNumber}`,
    );
  }
}
