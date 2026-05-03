import { DeliveryProvider } from "./types";

export type DeliveryErrorCode = 
  | 'MISSING_PROVIDER'
  | 'MISSING_CONFIG'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export class DeliveryError extends Error {
  code: DeliveryErrorCode;
  provider: DeliveryProvider;

  constructor(code: DeliveryErrorCode, provider: DeliveryProvider, details?: string) {
    const message = DeliveryError.getKoreanMessage(code, provider, details);
    super(message);
    this.name = 'DeliveryError';
    this.code = code;
    this.provider = provider;
  }

  private static getKoreanMessage(code: DeliveryErrorCode, provider: string, details?: string): string {
    const prefix = `[배송 조회 설정 오류]`;

    switch (code) {
      case 'MISSING_CONFIG':
        const vars = provider === 'MOCK' 
          ? 'MOCK_API_URL, MOCK_API_KEY'
          : 'SWEETTRACKER_API_URL, SWEETTRACKER_API_KEY';
        return `${prefix}\n필수 환경변수(${vars})가 모두 입력되었는지 점검하세요.`;

      case 'UNAUTHORIZED':
        return `${prefix}\n입력된 API 키가 유효하지 않습니다. 환경 변수의 키 값이 일치하는지 확인해주세요.`;

      case 'NOT_FOUND':
        return "해당 운송장 번호의 배송 정보를 찾을 수 없습니다. 번호가 정확한지 확인해주세요.";

      case 'NETWORK_ERROR':
        return "배송 서버와 통신할 수 없습니다. 서버 실행 상태(npm run dev) 또는 인터넷 연결을 확인해주세요.";

      case 'TIMEOUT':
        return "배송 조회 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";

      case 'SERVER_ERROR':
        return details || "배송 조회 서버 내부에서 오류가 발생했습니다. (상태 코드 500)";

      default:
        return details || "배송 조회 중 알 수 없는 오류가 발생했습니다.";
    }
  }
}
