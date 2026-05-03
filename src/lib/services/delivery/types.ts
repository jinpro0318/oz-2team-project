export type DeliveryStatus = 'preparing' | 'shipping' | 'delivered' | 'returned' | 'returning';

export interface TrackingHistory {
  time: string;      // YYYY-MM-DD HH:mm
  location: string;  // 현재 위치 (센터명 등)
  status: string;    // 배송 단계 명칭
  description: string; // 상세 메시지
}

export interface TrackingResult {
  carrier: string;        // 택배사 명
  carrierCode: string;    // 택배사 코드
  trackingNumber: string; // 운송장 번호
  status: DeliveryStatus; // 표준 상태값
  lastLocation: string;   // 현재 최종 위치
  history: TrackingHistory[]; // 배송 타임라인
}

export type DeliveryProvider = 'MOCK' | 'MAJOR';

export interface DeliveryServiceConfig {
  provider: DeliveryProvider;
  apiUrl: string;
  apiKey: string;
}
