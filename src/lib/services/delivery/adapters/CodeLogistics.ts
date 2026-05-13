import { 
  getShipment, 
  createMockShipment, 
  MOCK_STANDARD_PATH, 
  MOCK_RETURN_PATH,
  applyRevealFilter
} from "../../logistics";
import { TrackingResult, TrackingHistory } from "../types";


export class CodeLogistics {
  async track(carrierCode: string, trackingNumber: string, createdAt?: string, preFetchedShipment?: any): Promise<TrackingResult> {
    const isServer = typeof window === "undefined";
    
    // 1. DB 데이터 확보 (SSOT)
    let shipment = preFetchedShipment;
    
    if (!shipment && !isServer) {
      shipment = await getShipment(trackingNumber);
    }

    // 2. 데이터가 없으면 자동 생성 (Self-Healing) - 클라이언트 환경에서만
    if (!shipment && !isServer) {
      const { db } = await import("@/lib/firebase");
      const { doc, getDoc } = await import("firebase/firestore");
      
      // 주문 정보에서 주소지 추출 시도
      const orderId = trackingNumber.split('-')[1] || "";
      const orderSnap = await getDoc(doc(db, "orders", orderId));
      const orderData = orderSnap.data();
      
      const receiverAddress = orderData?.shippingAddress?.address || "서울 강남구 테헤란로";
      
      shipment = await createMockShipment({
        trackingNumber,
        carrierCode: "MOCK",
        orderId: orderId,
        senderAddress: "경기 성남시 분당구 판교역로",
        receiverAddress,
        targetStep: 0
      });
    }

    if (!shipment) {
      // 서버 환경이거나 모의 생성 실패 시 더미 데이터 반환
      shipment = {
        trackingNumber,
        receiverAddress: "서울 강남구 테헤란로",
        path: MOCK_STANDARD_PATH,
        currentStep: 0
      };
    }

    // 3. [지능형 지역명 치환 엔진]
    // 주소에서 '구/시'를 추출하여 경로의 '지역 터미널' 라벨을 구체화합니다.
    const address = shipment.receiverAddress || "";
    const region = address.split(' ')[1] || address.split(' ')[0] || "서울";
    
    const enrichedPath = shipment.path.map((step: any) => {
      if (step.location === "지역 터미널") {
        return { ...step, location: `${region} 터미널` };
      }
      return step;
    });

    // 4. [v10.1] DB의 currentStep을 기준으로 확정된 로그만 필터링 (SSOT 동기화)
    // [v14.0] 방어: step 값이 경로 배열 길이를 초과하지 않도록 클램핑
    const rawStep = shipment.currentStep || 0;
    const currentStep = Math.min(rawStep, enrichedPath.length - 1);
    const revealed = enrichedPath.slice(0, currentStep + 1);

    const history: TrackingHistory[] = revealed.map((step: any, idx: number) => ({
      time: step.estimatedTime || (idx === currentStep ? new Date().toISOString() : ""),
      location: step.location,
      status: step.statusLabel,
      message: step.message
    }));

    return {
      carrier: "CODE 로지스틱스",
      carrierCode: "MOCK",
      trackingNumber: shipment.trackingNumber,
      status: enrichedPath[currentStep].status as any,
      lastLocation: enrichedPath[currentStep].location,
      history
    };
  }
}

export const codeLogistics = new CodeLogistics();
