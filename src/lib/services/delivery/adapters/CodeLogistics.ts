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

// [v9.1] 무한 루프 방지를 위한 메모리 락 (Initialization Lock)
const initializingNumbers = new Set<string>();

export class CodeLogistics {
  private config: DeliveryServiceConfig;

  constructor(config: DeliveryServiceConfig) {
    this.config = config;
  }

  async track(carrierCode: string, trackingNumber: string, _createdAt?: string, preFetchedShipment?: any): Promise<TrackingResult> {
    // 1. DB에서 shipment 조회 (preFetchedShipment가 있으면 우선 사용)
    const shipment = preFetchedShipment || await getShipment(trackingNumber);

    // [실무형 알고리즘] 데이터 무결성 체크 (Stale Data Detection)
    const isStale = shipment && (
      !shipment.nextUpdateAt || // 최신 엔진 필드가 없거나
      shipment.path?.some((p: any) => p.statusLabel === "대기" || p.statusLabel === "완료") // 구버전 임시 라벨이 섞여있거나
    );

    if (!shipment || isStale) {
      if (!initializingNumbers.has(trackingNumber)) {
        initializingNumbers.add(trackingNumber);
        
        try {
          const { getDocuments, setDocument, where } = await import("@/lib/firestore");
          
          // 1. 주문 정보 재확인 (캐시 방지)
          const orders = await getDocuments<any>("orders", [where("trackingNumber", "==", trackingNumber)]);
          let orderDoc = orders[0];
          if (!orderDoc) {
            const ordersByArray = await getDocuments<any>("orders", [where("trackingNumbers", "array-contains", trackingNumber)]);
            orderDoc = ordersByArray[0];
          }

          // 2. 최신 물류 알고리즘 기반 데이터 생성
          const now = new Date();
          const type = (trackingNumber.split('-')[1]?.[0] || 'S') as 'S' | 'R' | 'E';
          const orderStatus = orderDoc?.status || "preparing";
          
          const templates = {
            S: {
              labels: ["상품준비", "배송시작", "허브이동", "배송지 기착", "배송출발", "배송완료"],
              locations: ["판매처 창고", "허브 터미널", "간선 노선", "지역 센터", "배송 지역", "고객님 댁"],
              messages: ["상품 포장을 완료했습니다.", "택배사로 상품이 전달되었습니다.", "상품이 허브를 통과 중입니다.", "지역 센터에 도착했습니다.", "기사님이 배송을 시작하셨습니다.", "배송이 완료되었습니다!"],
              steps: 6
            },
            R: {
              labels: ["반품접수", "수거중", "센터입고", "반품완료"],
              locations: ["고객님 댁", "수거 노선", "반품 센터", "판매처 창고"],
              messages: ["반품 접수가 완료되었습니다.", "기사님이 상품을 수거 중입니다.", "반품 센터에 입고되었습니다.", "반품 처리가 완료되었습니다."],
              steps: 4
            },
            E: {
              labels: ["교환접수", "수거중", "검수중", "교환상품 준비", "교환배송", "교환완료"],
              locations: ["고객님 댁", "수거 노선", "교환 센터", "판매처 창고", "배송 노선", "고객님 댁"],
              messages: ["교환 접수가 완료되었습니다.", "상품을 수거 중입니다.", "상품 검수 중입니다.", "새 상품을 준비 중입니다.", "교환 상품 배송이 시작되었습니다.", "교환이 완료되었습니다."],
              steps: 6
            }
          };

          const tpl = templates[type] || templates.S;
          let initialStep = 0;
          if (orderStatus === "shipping") initialStep = 1;
          else if (orderStatus === "delivered" || orderStatus === "purchase_confirmed") initialStep = tpl.steps - 1;

          // 타임라인 역산 (실제 물류 흐름처럼 보이게)
          const path = Array.from({ length: tpl.steps }).map((_, i) => {
            const stepTime = new Date(now.getTime() - (initialStep - i) * 2 * 60 * 60 * 1000);
            const isDone = i <= initialStep;
            return {
              label: `단계 ${i + 1}`,
              statusLabel: tpl.labels[i],
              status: i === initialStep ? orderStatus : (i < initialStep ? "finished" : "pending"),
              location: tpl.locations[i],
              message: isDone ? tpl.messages[i] : "대기 중입니다.",
              estimatedTime: isDone ? stepTime.toISOString() : ""
            };
          });

          const upgradedShipment = {
            shipmentId: trackingNumber,
            orderId: orderDoc?.id || "unknown",
            type,
            status: path[initialStep].status,
            currentStep: initialStep,
            path,
            createdAt: shipment?.createdAt || new Date(now.getTime() - initialStep * 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: now.toISOString(),
            nextUpdateAt: initialStep < tpl.steps - 1 ? new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString() : null,
            version: "2.0" // 데이터 버전 관리
          };

          await setDocument("shipments", trackingNumber, upgradedShipment);
          console.log(`[Data-Migrator] Force Upgraded Stale Shipment: ${trackingNumber}`);
          
          return this.track(carrierCode, trackingNumber, _createdAt, upgradedShipment);

        } catch (e) {
          console.error("[Data-Migrator] Critical Error:", e);
        } finally {
          setTimeout(() => initializingNumbers.delete(trackingNumber), 5000);
        }
      }

      // 복구 중 placeholder (UI용)
      return {
        carrier: "CODE 로지스틱스",
        carrierCode,
        trackingNumber,
        status: "preparing",
        lastLocation: "판매처",
        history: [{
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
          location: "데이터 정렬 중",
          status: "마이그레이션",
          description: "최신 물류 엔진으로 데이터를 업그레이드 중입니다. 잠시만 기다려 주세요.",
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
