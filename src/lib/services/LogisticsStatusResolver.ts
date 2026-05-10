import {
  MOCK_STANDARD_PATH,
  MOCK_EXCHANGE_PATH,
  MOCK_RETURN_PATH,
  PathStep,
} from "./logistics";

export type OrderActionIntent =
  | "PAYMENT_DONE" // 👈 [v11.1] 결제 완료 시 엔진을 깨우는 최초의 트리거
  | "DELETE_LOGISTICS" // 👈 [v11.8] 물류 정보(송장) 초기화 명령
  | "ASSIGN_TRACKING" // 👈 [v11.11] 송장 부여 명령
  | "PREPARE"
  | "DISPATCH"
  | "DELIVER"
  | "RETURN_PICKUP"
  | "RECEIVE_ITEM"
  | "RESHIP_ITEM"
  | "EXCHANGE_DONE"
  | "PURCHASE_CONFIRM"
  | "CLAIM_REJECT"
  | "SIMULATE_NEXT"
  | "REVERT_PHASE";

export interface ResolvedAction {
  status?: string;
  step?: number;
  shouldUpdateShipment: boolean;
  requiresNewShipment?: "ES" | "EQ" | "none"; // 👈 추가: 교환용 새 송장 발급 필요 여부
}

export class LogisticsStatusResolver {
  // [일반 배송 (S)] 주문 상태 -> 배송 인덱스 매핑
  static readonly ORDER_TO_STANDARD_INDEX: Record<string, number> = {
    payment_complete: 0,
    preparing: 1, // 1: 판매처 창고
    shipping: 2, // 2: 지역 터미널
    delivered: 3, // 3: 고객님 댁
    purchase_confirmed: 4, // 4: 주문 종료
  };

  // [반품 배송 (R)] 주문 상태 -> 배송 인덱스 매핑
  static readonly ORDER_TO_RETURN_INDEX: Record<string, number> = {
    return_requested: 0,
    returning: 1, // 1: 수거지 인근 (수거중)
    returned: 2, // 2: 수거지 (수거완료)
    return_completed: 3, // 3: 판매처 (반품완료)
  };

  // [교환 배송 (E)] 주문 상태 -> 배송 인덱스 매핑
  static readonly ORDER_TO_EXCHANGE_INDEX: Record<string, number> = {
    exchange_requested: 0,
    returning: 1, // 1: 수거지 인근 (수거중)
    returned: 2, // 2: 수거지 (수거완료)
    inspecting: 3, // 3: 검수 센터 (검수중 - 현재 시스템에 명시적 상태가 없다면 생략 가능)
    reshipping: 4, // 4: 분류 센터 (교환배송 - 수동 상태 제어용)
    exchange_completed: 5, // 5: 고객님 댁 (교환완료)
    purchase_confirmed: 6, // 6: 주문 종료 (구매확정)
  };

  static readonly STANDARD_STEPS = [
    { title: "상품준비" },
    { title: "배송중" },
    { title: "배송완료" },
  ];

  static readonly RETURN_STEPS = [
    { title: "반품접수" },
    { title: "수거중" },
    { title: "수거완료" },
    { title: "검수중" },
    { title: "반품완료" },
  ];

  static readonly EXCHANGE_STEPS = [
    { title: "교환접수" }, // 수정됨: 반품접수 -> 교환접수
    { title: "수거중" },
    { title: "수거완료" },
    { title: "검수중" },
    { title: "교환배송" },
    { title: "배송완료" },
    { title: "구매확정" }, // 7단계 추가
  ];

  /**
   * 주문 상태와 배송 타입을 받아, 가장 알맞은 배송 인덱스(currentStep)를 반환합니다.
   * 매핑되지 않은 상태인 경우 기본값 0을 반환합니다.
   */
  static getTargetIndex(
    orderStatus: string,
    shipmentType: "S" | "R" | "E",
  ): number {
    if (shipmentType === "S") {
      return this.ORDER_TO_STANDARD_INDEX[orderStatus] ?? 0;
    }
    if (shipmentType === "R") {
      return this.ORDER_TO_RETURN_INDEX[orderStatus] ?? 0;
    }
    if (shipmentType === "EQ" || shipmentType === "ES") {
      return this.ORDER_TO_EXCHANGE_INDEX[orderStatus] ?? 0;
    }
    return 0;
  }

  /**
   * UI용 Stepper 아이템 리스트를 반환합니다.
   * 부모/자식 컴포넌트가 모두 동일한 라벨을 참조할 수 있도록 합니다.
   */
  static getUISteps(
    shipmentType: "S" | "R" | "E" | "none" | null,
  ): { title: string }[] {
    if (shipmentType === "R") {
      return MOCK_RETURN_PATH.map((p) => ({ title: p.statusLabel }));
    }
    if (shipmentType === "EQ" || shipmentType === "ES") {
      return MOCK_EXCHANGE_PATH.map((p) => ({ title: p.statusLabel }));
    }
    // 기본(Standard) 및 'none'
    return MOCK_STANDARD_PATH.map((p) => ({ title: p.statusLabel }));
  }

  /**
   * 배송 문서를 자동 생성해야 하는 "시작" 주문 상태들을 정의합니다.
   */
  static readonly SHIPMENT_CREATION_TRIGGERS = [
    "preparing",
    "shipping",
    "returning",
    "exchange_requested",
    "return_requested",
  ];

  /**
   * 배송 상태 전진 시 기록할 기본 상태값을 반환합니다. (Shipment.status 용)
   */
  static getShipmentStatusForIndex(
    index: number,
    shipmentType: "S" | "R" | "E",
  ): string {
    let path: PathStep[] = MOCK_STANDARD_PATH;
    if (shipmentType === "R") path = MOCK_RETURN_PATH;
    if (shipmentType === "EQ" || shipmentType === "ES") path = MOCK_EXCHANGE_PATH;

    return path[index]?.status || "shipping";
  }

  /**
   * 프론트엔드의 의도(Intent)를 해석하여 정확한 주문 상태(status)와 배송 단계(step)를 반환합니다.
   */
  static resolveAction(
    intent: OrderActionIntent,
    currentStep: number,
    shipmentType: "S" | "R" | "EQ" | "ES",
  ): ResolvedAction {
    switch (intent) {
      case "PAYMENT_DONE":
        // [v11.1] 결제 완료 시 0단계로 초기화하되, 송장은 굽지 않음(shouldUpdateShipment: false)
        return { status: "payment_complete", step: 0, shouldUpdateShipment: false };
      case "DELETE_LOGISTICS":
        // [v11.8] 송장 삭제 시 상태는 건드리지 않고(null), 송장 업데이트를 막습니다.
        // 삭제 로직의 본체는 엔진에서 intent를 확인하여 수행합니다.
        return { status: null, step: undefined, shouldUpdateShipment: false };
      case "ASSIGN_TRACKING":
        // [v11.11] 송장 수동/자동 부여 시. 상태는 건드리지 않지만 배송 문서는 확실히 생성합니다.
        return { status: null, step: undefined, shouldUpdateShipment: true };
      case "PREPARE":
        return { status: "preparing", step: 1, shouldUpdateShipment: true };
      case "DISPATCH":
        if (shipmentType === "ES" || shipmentType === "EQ")
          return { status: "reshipping", step: 4, shouldUpdateShipment: true };
        return { status: "shipping", step: 2, shouldUpdateShipment: true };
      case "DELIVER":
        if (shipmentType === "ES" || shipmentType === "EQ")
          return {
            status: "exchange_completed",
            step: 5,
            shouldUpdateShipment: true,
          };
        if (shipmentType === "R")
          return {
            status: "return_completed",
            step: 3,
            shouldUpdateShipment: true,
          };
        return { status: "delivered", step: 3, shouldUpdateShipment: true };
      case "RETURN_PICKUP":
        return { status: "returning", step: 1, shouldUpdateShipment: true };
      case "RECEIVE_ITEM":
        return { status: "returned", step: 2, shouldUpdateShipment: true };
      case "RESHIP_ITEM":
        return {
          status: "reshipping",
          step: 4,
          shouldUpdateShipment: true,
          requiresNewShipment: "ES", // 👈 수거 완료 후 재발송 시 송장 교체
        };
      case "EXCHANGE_DONE":
        return {
          status: "exchange_completed",
          step: 5,
          shouldUpdateShipment: true,
        };
      case "PURCHASE_CONFIRM":
        // [v12.5] 구매 확정 시 타임라인의 마지막 노드(구매확정)까지 모두 활성화하도록 강제 동기화
        const lastStep = (shipmentType === "EQ" || shipmentType === "ES") ? 6 : (shipmentType === "R" ? 3 : 4);
        return {
          status: "purchase_confirmed",
          step: lastStep,
          shouldUpdateShipment: true,
        };
      case "CLAIM_REJECT":
        return { status: "claim_rejected", shouldUpdateShipment: false };

      case "SIMULATE_NEXT": {
        const nextStep = currentStep + 1;
        const nextStatus = this.getStatusFromIndex(nextStep, shipmentType);
        
        // 단, 이미 재발송 송장(ES)인 경우는 중복 발급하지 않음
        const requiresNewShipment = ((shipmentType === "EQ" || shipmentType === "ES") && nextStep === 4) ? "ES" : "none";
        
        return {
          status: nextStatus,
          step: nextStep,
          shouldUpdateShipment: !!nextStatus,
          requiresNewShipment,
        };
      }

      case "REVERT_PHASE": {
        const prevStep = Math.max(0, currentStep - 1);
        const prevStatus = this.getStatusFromIndex(prevStep, shipmentType);
        return {
          status: prevStatus,
          step: prevStep,
          shouldUpdateShipment: !!prevStatus,
        };
      }

      default:
        throw new Error(
          `[LogisticsStatusResolver] 알 수 없는 명령어(Intent)입니다: ${intent}`,
        );
    }
  }

  /**
   * 배송 인덱스를 기반으로 주문 상태(Order Status)를 역산출합니다. (역방향 매핑)
   */
  static getStatusFromIndex(
    index: number,
    shipmentType: "S" | "R" | "EQ" | "ES",
  ): string | undefined {
    let mapping: Record<string, number>;
    if (shipmentType === "R") mapping = this.ORDER_TO_RETURN_INDEX;
    else if (shipmentType === "EQ" || shipmentType === "ES") mapping = this.ORDER_TO_EXCHANGE_INDEX;
    else mapping = this.ORDER_TO_STANDARD_INDEX;

    // value(index)를 통해 key(status)를 찾습니다.
    for (const [status, mappedIndex] of Object.entries(mapping)) {
      if (mappedIndex === index) {
        return status;
      }
    }
    return undefined; // 매핑된 상태가 없는 경우
  }
}
