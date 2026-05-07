/**
 * ═══════════════════════════════════════════════════════════════
 * [v9.0 §15] CODE 로지스틱스 Stateful 어댑터
 * ═══════════════════════════════════════════════════════════════
 * - 모든 Stateless 시간 계산 로직 제거 (Clean Slate)
 * - DB(shipments 컬렉션)가 유일한 진실 공급원(Single Source of Truth)
 * - Temporal Reveal Engine으로 노출 여부만 시간 기반 결정
 */
import { TrackingResult, DeliveryServiceConfig } from "../types";
import { getShipment, applyRevealFilter, generateDriver } from "../../logistics";

export class CodeLogistics {
  private config: DeliveryServiceConfig;

  constructor(config: DeliveryServiceConfig) {
    this.config = config;
  }

  async track(carrierCode: string, trackingNumber: string, _createdAt?: string): Promise<TrackingResult> {
    // 1. DB에서 shipment 조회 (유일한 진실 공급원)
    const shipment = await getShipment(trackingNumber);

    if (!shipment) {
      // DB에 없는 경우: 아직 출고 전이거나 송장만 발급된 상태
      return {
        carrier: "CODE 로지스틱스",
        carrierCode,
        trackingNumber,
        status: "preparing",
        lastLocation: "판매처",
        history: [{
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          location: "판매처",
          status: "송장 발급 완료",
          description: "CODE 로지스틱스 전용 송장이 발급되었습니다. 출고 준비 중입니다.",
        }],
      };
    }

    // 2. Reveal Engine: 현재 시각 기준으로 확정/예정 로그 분리
    const { revealed, pending } = applyRevealFilter(shipment.path);
    const driver = shipment.driver;

    // 3. 확정된 로그를 TrackingHistory 형식으로 변환
    const history = revealed.map(step => ({
      time: new Date(step.estimatedTime).toISOString().replace('T', ' ').slice(0, 16),
      location: step.location,
      status: step.statusLabel,
      description: step.message,
    }));

    // 4. 배송 상태 결정
    let status: TrackingResult["status"];
    if (shipment.status === 'DELIVERED') {
      status = "delivered";
    } else if (revealed.length === 0) {
      status = "preparing";
    } else {
      status = "shipping";
    }

    // 5. 마지막 확정 위치
    const lastRevealed = revealed[revealed.length - 1];
    const lastLocation = lastRevealed
      ? `${lastRevealed.location} (${lastRevealed.statusLabel})`
      : "판매처";

    // 6. 기사 정보를 마지막 히스토리 항목에 추가 (배송출발 이후)
    const driverSteps = ["배송출발", "배송완료", "수거완료"];
    if (lastRevealed && driverSteps.includes(lastRevealed.statusLabel)) {
      const lastHistory = history[history.length - 1];
      lastHistory.description += ` [기사: ${driver.name} / ${driver.vehicle} / ${driver.contact}]`;
    }

    return {
      carrier: "CODE 로지스틱스",
      carrierCode,
      trackingNumber,
      status,
      lastLocation,
      history,
    };
  }
}
