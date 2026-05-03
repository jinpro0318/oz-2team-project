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

  async track(carrierCode: string, trackingNumber: string): Promise<TrackingResult> {
    if (!this.config.apiKey) {
      throw new DeliveryError("MISSING_CONFIG", "MAJOR", "스윗트래커 API 키가 설정되지 않았습니다.");
    }

    try {
      const url = new URL(this.BASE_URL);
      url.searchParams.append("t_key", this.config.apiKey);
      url.searchParams.append("t_code", carrierCode);
      url.searchParams.append("t_invoice", trackingNumber);

      console.log(`[SweetTracker Request] URL: ${url.origin}${url.pathname}?t_key=HIDDEN&t_code=${carrierCode}&t_invoice=${trackingNumber}`);

      const response = await fetch(url.toString());
      const data = await response.json();

      console.log(`[SweetTracker Response] Data:`, JSON.stringify(data));

      // 스윗트래커 오류 응답 처리
      if (data.status === false || data.result === "N") {
        throw new DeliveryError(
          "NOT_FOUND", 
          "MAJOR",
          data.msg || "배송 정보를 찾을 수 없거나 조회가 불가능합니다."
        );
      }

      const carrierNames: Record<string, string> = {
        "01": "우체국택배",
        "04": "CJ대한통운",
        "05": "한진택배",
        "06": "로젠택배",
        "08": "롯데택배",
        "24": "GS25 편의점택배",
        "46": "CU 편의점택배",
        "MOCK": "CODE 로지스틱스"
      };

      // 우리 시스템 규격으로 데이터 매핑
      return {
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
        }))
      };
    } catch (err: any) {
      if (err instanceof DeliveryError) throw err;
      console.error("[SweetTracker Error Details]:", err);
      throw new DeliveryError("SERVER_ERROR", "MAJOR", err.message || "배송 조회 서비스와 통신 중 오류가 발생했습니다.");
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
