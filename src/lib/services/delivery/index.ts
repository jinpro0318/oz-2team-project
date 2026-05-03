import { TrackingResult, DeliveryServiceConfig } from "./types";
import { DeliveryError } from "./errors";
import { CodeLogistics } from "./adapters/CodeLogistics";
import { MajorAdapter } from "./adapters/MajorAdapter";

/**
 * 하이브리드 배송 조회 통합 엔진 (DeliveryEngine)
 * 이제 환경변수 없이 송장번호 패턴에 따라 자동으로 공급자를 결정합니다.
 */
class DeliveryEngine {
  private static instance: DeliveryEngine;
  private codeLogistics: CodeLogistics;
  private majorAdapter: MajorAdapter;

  private constructor() {
    // 1. 설정 구성 (환경변수에서 API 정보만 읽어옴)
    const codeLogisticsConfig: DeliveryServiceConfig = {
      provider: 'MOCK',
      apiUrl: process.env.MOCK_API_URL || '',
      apiKey: process.env.MOCK_API_KEY || '',
    };

    const majorConfig: DeliveryServiceConfig = {
      provider: 'MAJOR',
      apiUrl: process.env.SWEETTRACKER_API_URL || '',
      apiKey: process.env.SWEETTRACKER_API_KEY || '',
    };

    // 2. 어댑터 초기화
    this.codeLogistics = new CodeLogistics(codeLogisticsConfig);
    this.majorAdapter = new MajorAdapter(majorConfig);
  }

  public static getInstance(): DeliveryEngine {
    if (!DeliveryEngine.instance) {
      DeliveryEngine.instance = new DeliveryEngine();
    }
    return DeliveryEngine.instance;
  }

  /**
   * 통합 배송 조회 인터페이스
   * @param carrierCode 택배사 코드
   * @param trackingNumber 운송장 번호
   * @param createdAt 주문 생성 시간 (ISO 8601) - CodeLogistics 시뮬레이션용
   */
  public async track(carrierCode: string, trackingNumber: string, createdAt?: string): Promise<TrackingResult> {
    if (!carrierCode || !trackingNumber) {
      throw new DeliveryError('NOT_FOUND', 'MOCK', "택배사 코드 또는 운송장 번호가 누락되었습니다.");
    }

    // [지능형 라우팅] 
    // 1. 송장번호가 "MOCK"으로 시작하거나 택배사 코드가 "MOCK"인 경우 CODE 로지스틱스 호출
    const isCodeLogistics = 
      trackingNumber.toUpperCase().startsWith("MOCK") || 
      carrierCode.toUpperCase() === "MOCK";

    if (isCodeLogistics) {
      return this.codeLogistics.track(carrierCode, trackingNumber, createdAt);
    }

    // 2. 그 외 모든 일반 번호는 실제 택배사 API(SweetTracker)로 호출
    return this.majorAdapter.track(carrierCode, trackingNumber);
  }
}

export const deliveryService = DeliveryEngine.getInstance();
