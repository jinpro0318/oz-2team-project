import { TrackingResult, DeliveryServiceConfig } from "../types";
import { DeliveryError } from "../errors";

/**
 * 스윗트래커(SweetTracker) 배송 조회 서비스 어댑터
 */
export class MajorAdapter {
  private config: DeliveryServiceConfig;
  private readonly BASE_URL = "https://info.sweettracker.co.kr/api/v1/trackingInfo";

  constructor(config: DeliveryServiceConfig) {
    this.config = config;
  }

  async track(carrierCode: string, trackingNumber: string, forceUpdate?: boolean): Promise<TrackingResult> {
    if (!this.config.apiKey) {
      throw new DeliveryError("MISSING_CONFIG", "MAJOR", "스윗트래커 API 키가 설정되지 않았습니다.");
    }

    try {
      const { db } = await import("@/lib/firebase");
      const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");

      // 1. 전역 캐싱 설정 읽기
      const settingsRef = doc(db, "settings", "logistics");
      const settingsSnap = await getDoc(settingsRef);
      const cacheMinutes = settingsSnap.exists() ? settingsSnap.data().sweetTrackerCacheInterval : 60;

      // 2. DB 캐시 확인 (forceUpdate가 아닐 때만)
      const shipmentRef = doc(db, "shipments", trackingNumber);
      const shipmentSnap = await getDoc(shipmentRef);

      if (shipmentSnap.exists() && !forceUpdate) {
        const cachedData = shipmentSnap.data();
        const lastUpdated = cachedData.lastUpdatedAt?.toDate();
        
        if (lastUpdated) {
          const diffMinutes = (new Date().getTime() - lastUpdated.getTime()) / (1000 * 60);
          
          // 배송 완료된 데이터는 영구 캐싱, 배송 중인 데이터는 설정 주기 내에서 캐싱
          if (cachedData.status === "delivered" || diffMinutes < cacheMinutes) {
            console.log(`[Cache HIT] Using cached data for ${trackingNumber} (Last updated: ${lastUpdated.toLocaleString()})`);
            return {
              ...cachedData.lastTrackingResult,
              isFromCache: true,
              lastSyncedAt: lastUpdated.toISOString()
            };
          }
        }
      }

      // 3. 캐시가 없거나 만료된 경우: 스윗트래커 API 호출
      const url = new URL(this.BASE_URL);
      url.searchParams.append("t_key", this.config.apiKey);
      url.searchParams.append("t_code", carrierCode);
      url.searchParams.append("t_invoice", trackingNumber);

      console.log(`[Cache MISS] Fetching from SweetTracker API: ${trackingNumber}`);

      const response = await fetch(url.toString());
      const data = await response.json();

      // 스윗트래커 오류 응답 처리
      if (data.status === false || data.result === "N") {
        // API 오류 시, 만약 기존 캐시 데이터가 있다면 그거라도 반환 (Fail-safe)
        if (shipmentSnap.exists()) {
          const cachedData = shipmentSnap.data();
          return {
            ...cachedData.lastTrackingResult,
            isFromCache: true,
            isStale: true,
            lastSyncedAt: cachedData.lastUpdatedAt?.toDate().toISOString()
          };
        }
        throw new DeliveryError("NOT_FOUND", "MAJOR", data.msg || "배송 정보를 찾을 수 없습니다.");
      }

      const carrierNames: Record<string, string> = {
        "01": "우체국택배", "04": "CJ대한통운", "05": "한진택배", "06": "로젠택배",
        "08": "롯데택배", "24": "GS25 편의점택배", "46": "CU 편의점택배", "MOCK": "CODE 로지스틱스"
      };

      const result: TrackingResult = {
        carrier: carrierNames[carrierCode] || "택배", 
        carrierCode,
        trackingNumber,
        status: this.mapStatus(data.level),
        lastLocation: data.lastDetail?.where || "정보 없음",
        history: (data.trackingDetails || []).map((detail: any) => ({
          time: detail.timeString,
          location: detail.where,
          status: detail.kind,
          description: detail.remark || ""
        })),
        lastSyncedAt: new Date().toISOString()
      };

      // 4. DB 캐시 저장 및 주문 상태 동기화
      await setDoc(shipmentRef, {
        isMock: false,
        carrierCode,
        orderId: shipmentSnap.exists() ? shipmentSnap.data().orderId : "", // 기존 orderId 보존
        status: result.status,
        lastTrackingResult: result,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

      // 배송 완료 시 주문 상태 자동 업데이트
      if (result.status === "delivered") {
        const orderId = shipmentSnap.exists() ? shipmentSnap.data().orderId : "";
        if (orderId) {
          const orderRef = doc(db, "orders", orderId);
          await updateDoc(orderRef, { 
            status: "delivered",
            updatedAt: new Date().toISOString()
          });
        }
      }

      return result;
    } catch (err: any) {
      if (err instanceof DeliveryError) throw err;
      throw new DeliveryError("SERVER_ERROR", "MAJOR", err.message || "배송 조회 중 오류가 발생했습니다.");
    }
  }

  /**
   * 스윗트래커 레벨(1~6)을 우리 시스템 상태로 매핑
   * 1: 배송준비중, 2: 집화완료, 3: 배송중, 4: 배송출발, 5: 배송완료, 6: 기타
   */
  private mapStatus(level: number): TrackingResult["status"] {
    switch (level) {
      case 1:
      case 2:
        return "preparing";
      case 3:
      case 4:
        return "shipping";
      case 5:
        return "delivered";
      case 6:
        return "returned";
      default:
        return "shipping";
    }
  }
}
