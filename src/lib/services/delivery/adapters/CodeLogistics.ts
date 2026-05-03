/**
 * CODE 로지스틱스 자체 배송 시뮬레이션 시스템 (CodeLogistics)
 */
import { TrackingResult, DeliveryServiceConfig } from "../types";
import { DeliveryError } from "../errors";

export class CodeLogistics {
  private config: DeliveryServiceConfig;

  constructor(config: DeliveryServiceConfig) {
    this.config = config;
  }

  async track(carrierCode: string, trackingNumber: string, createdAt?: string): Promise<TrackingResult> {
    const now = new Date();
    
    // 1. 시간 기반 동적 상태 계산
    const createDate = createdAt ? new Date(createdAt) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const diffMinutes = Math.max(0, Math.floor((now.getTime() - createDate.getTime()) / (60 * 1000)));

    // 2. 송장번호 해시 (일관된 무작위성)
    const getHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };
    const hashValue = getHash(trackingNumber);
    
    let status: TrackingResult["status"] = "preparing";
    let lastLocation = "판매처";
    let history: TrackingResult["history"] = [];

    const formatTime = (minusMinutes: number) => {
      const d = new Date(now.getTime() - minusMinutes * 60 * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // 3. 경과 시간에 따른 시나리오
    if (diffMinutes < 60) {
      status = "preparing";
      lastLocation = "판매처 (확인 중)";
      history = [{ time: formatTime(diffMinutes), location: "판매처", status: "결제 완료", description: "주문이 정상 접수되었습니다." }];
    } 
    else if (diffMinutes < 180) {
      status = "preparing";
      lastLocation = "판매처 (상품 준비 중)";
      history = [
        { time: formatTime(diffMinutes), location: "판매처", status: "결제 완료", description: "주문이 정상 접수되었습니다." },
        { time: formatTime(diffMinutes - 60), location: "판매처", status: "상품 준비 중", description: "판매자가 상품을 포장하고 있습니다." }
      ];
    }
    else if (diffMinutes < 1440) {
      status = "shipping";
      lastLocation = "물류 센터";
      history = [
        { time: formatTime(diffMinutes), location: "판매처", status: "결제 완료", description: "주문이 정상 접수되었습니다." },
        { time: formatTime(diffMinutes - 180), location: "물류 센터", status: "상품 발송", description: "배송이 시작되었습니다." }
      ];
    }
    else {
      status = "shipping";
      lastLocation = "지역 배송 센터";
      history = [
        { time: formatTime(diffMinutes), location: "판매처", status: "결제 완료", description: "주문이 정상 접수되었습니다." },
        { time: formatTime(diffMinutes - 180), location: "물류 센터", status: "상품 발송", description: "배송 시작" },
        { time: formatTime(0), location: "지역 배송 센터", status: "배송 중", description: "정상 배송 중입니다." }
      ];
      if (hashValue % 2 === 0 && diffMinutes > 2880) {
        status = "delivered";
        lastLocation = "고객님 자택";
        history.push({ time: formatTime(0), location: "고객님 자택", status: "배송 완료", description: "배송이 완료되었습니다." });
      }
    }

    return {
      carrier: "CODE 로지스틱스",
      carrierCode,
      trackingNumber,
      status,
      lastLocation,
      history
    };
  }
}
