import {
  MOCK_STANDARD_PATH,
  MOCK_EXCHANGE_PICKUP_PATH,
  MOCK_EXCHANGE_RESHIP_PATH,
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
  | "REVERT_PHASE"
  | "CLAIM_REQUEST"
  | "START_INSPECTION"
  | "COMPLETE_INSPECTION"
  | "PREPARE_RESHIP";

export interface ResolvedAction {
  status?: string | null;
  step?: number;
  shouldUpdateShipment: boolean;
  requiresNewShipment?: "ES" | "EQ" | "none";
  error?: string; // [v13.20] 정책 위반 시 에러 메시지
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

  // [v13.20] [4+4] 교환 수거 (EQ) 전용 인덱스 매핑
  static readonly ORDER_TO_EXCHANGE_PICKUP_INDEX: Record<string, number> = {
    exchange_requested: 0, // 교환접수
    returning: 1, // 수거중
    returned: 2, // 수거완료
    inspection_completed: 3, // 검수완료 (EQ의 마지막)
  };

  // [v13.20] [4+4] 교환 재발송 (ES) 전용 인덱스 매핑
  static readonly ORDER_TO_EXCHANGE_RESHIP_INDEX: Record<string, number> = {
    exchange_preparing: 0, // 상품준비
    reshipping: 1, // 교환배송
    exchange_completed: 2, // 배송완료
    purchase_confirmed: 3, // 구매확정
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
    { title: "배송완료" },
  ];

  /**
   * [v13.20] 송장 번호가 시뮬레이션(Mock)용인지 판별합니다.
   */
  static isMockTracking(trackingNumber: string | null | undefined): boolean {
    return !!trackingNumber && trackingNumber.startsWith("MOCK-");
  }

  /**
   * [v13.20] 4+4 Phase Finalization: 송장 타입별 도달 가능한 최대 단계(Step)를 반환합니다.
   */
  static getMaxStepForType(shipmentType: "S" | "R" | "EQ" | "ES"): number {
    switch (shipmentType) {
      case "EQ":
        return 3; // 검수완료까지만 허용
      case "R":
        return 3; // 반품완료까지만 허용
      case "ES":
        return 3; // 구매확정까지 허용
      case "S":
        return 4; // 구매확정까지 허용
      default:
        return 4;
    }
  }

  /**
   * 주문 상태와 배송 타입을 받아, 가장 알맞은 배송 인덱스(currentStep)를 반환합니다.
   * 매핑되지 않은 상태인 경우 기본값 0을 반환합니다.
   */
  static getTargetIndex(
    orderStatus: string,
    shipmentType: "S" | "R" | "E" | "EQ" | "ES",
  ): number {
    if (shipmentType === "S") {
      return this.ORDER_TO_STANDARD_INDEX[orderStatus] ?? 0;
    }
    if (shipmentType === "R") {
      return this.ORDER_TO_RETURN_INDEX[orderStatus] ?? 0;
    }
    // [v13.20] 4+4: EQ와 ES를 각각 전용 인덱스로 분리
    if (shipmentType === "EQ") {
      return this.ORDER_TO_EXCHANGE_PICKUP_INDEX[orderStatus] ?? 0;
    }
    if (shipmentType === "ES") {
      return this.ORDER_TO_EXCHANGE_RESHIP_INDEX[orderStatus] ?? 0;
    }
    return 0;
  }

  /**
   * UI용 Stepper 아이템 리스트를 반환합니다.
   * 부모/자식 컴포넌트가 모두 동일한 라벨을 참조할 수 있도록 합니다.
   */
  static getUISteps(
    shipmentType: "S" | "R" | "E" | "EQ" | "ES" | "none" | null,
  ): { title: string }[] {
    if (shipmentType === "R") {
      return MOCK_RETURN_PATH.map((p) => ({ title: p.statusLabel }));
    }
    // [v13.20] 4+4: EQ와 ES를 각각 전용 경로에서 라벨을 생성
    if (shipmentType === "EQ") {
      return MOCK_EXCHANGE_PICKUP_PATH.map((p) => ({ title: p.statusLabel }));
    }
    if (shipmentType === "ES") {
      return MOCK_EXCHANGE_RESHIP_PATH.map((p) => ({ title: p.statusLabel }));
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
    shipmentType: "S" | "R" | "E" | "EQ" | "ES",
  ): string {
    let path: PathStep[] = MOCK_STANDARD_PATH;
    if (shipmentType === "R") path = MOCK_RETURN_PATH;
    if (shipmentType === "EQ") path = MOCK_EXCHANGE_PICKUP_PATH;
    if (shipmentType === "ES") path = MOCK_EXCHANGE_RESHIP_PATH;

    return path[index]?.status || "shipping";
  }

  /**
   * 프론트엔드의 의도(Intent)를 해석하여 정확한 주문 상태(status)와 배송 단계(step)를 반환합니다.
   */
  static resolveAction(
    intent: OrderActionIntent,
    currentStep: number,
    shipmentType: "S" | "R" | "EQ" | "ES",
    trackingNumber?: string, // [v13.20] 신분 확인용
  ): ResolvedAction {
    // [v13.20] 리얼 모드 보호 가드: Mock이 아닌 경우 시뮬레이션 명령 차단
    const isMock = !trackingNumber || this.isMockTracking(trackingNumber);
    if ((intent === "SIMULATE_NEXT" || intent === "REVERT_PHASE") && !isMock) {
      console.warn(
        `[Policy] 리얼 모드(${trackingNumber})에서 시뮬레이션 명령(${intent}) 차단`,
      );
      return {
        shouldUpdateShipment: false,
        error: "리얼 모드에서는 자동 전이를 사용할 수 없습니다.",
      };
    }

    switch (intent) {
      case "PAYMENT_DONE":
        // [v11.1] 결제 완료 시 0단계로 초기화하되, 송장은 굽지 않음(shouldUpdateShipment: false)
        return {
          status: "payment_complete",
          step: 0,
          shouldUpdateShipment: false,
        };
      case "DELETE_LOGISTICS":
        // [v11.8] 송장 삭제 시 상태는 건드리지 않고(null), 송장 업데이트를 막습니다.
        // 삭제 로직의 본체는 엔진에서 intent를 확인하여 수행합니다.
        return { status: null, step: undefined, shouldUpdateShipment: false };
      case "CLAIM_REQUEST":
        // [v13.5] 클레임 요청: 완전히 새로운 사이클의 시작을 알림. 엔진은 기존 송장을 아카이브하고 0단계 상태로 대기해야 함.
        return { status: null, step: 0, shouldUpdateShipment: false };
      case "ASSIGN_TRACKING":
        // [v11.11] 송장 수동/자동 부여 시. 상태는 건드리지 않지만 배송 문서는 확실히 생성합니다.
        return { status: null, step: undefined, shouldUpdateShipment: true };
      case "PREPARE":
        return { status: "preparing", step: 1, shouldUpdateShipment: true };
      case "DISPATCH":
        if (shipmentType === "ES")
          return { status: "reshipping", step: 1, shouldUpdateShipment: true };
        if (shipmentType === "EQ")
          return { status: "returning", step: 1, shouldUpdateShipment: true };
        return { status: "shipping", step: 2, shouldUpdateShipment: true };
      case "DELIVER":
        if (shipmentType === "ES")
          return {
            status: "delivered",
            step: 2,
            shouldUpdateShipment: true,
          };
        if (shipmentType === "EQ")
          return {
            status: "returned", // EQ 송장은 배송완료 불가 (수거완료에서 정지)
            step: 2,
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
      case "START_INSPECTION":
        return { status: "inspecting", step: 3, shouldUpdateShipment: true };
      case "COMPLETE_INSPECTION":
        return {
          status: "inspection_completed",
          step: 3,
          shouldUpdateShipment: true,
        };
      case "PREPARE_RESHIP":
        return {
          status: "exchange_preparing",
          step: 0,
          shouldUpdateShipment: true,
          requiresNewShipment: "ES",
        };
      case "RESHIP_ITEM":
        return {
          status: "reshipping",
          step: 1,
          shouldUpdateShipment: true,
          // [v13.7] 현재 타입이 수거(EQ)인 경우에만 새 송장 발급 트리거
          requiresNewShipment: shipmentType === "EQ" ? "ES" : "none",
        };
      case "EXCHANGE_DONE":
        return {
          status: "exchange_completed",
          step: 3,
          shouldUpdateShipment: true,
        };
      case "PURCHASE_CONFIRM":
        // [v12.5] 구매 확정 시 타임라인의 마지막 노드(구매확정)까지 모두 활성화하도록 강제 동기화
        const lastStep =
          shipmentType === "EQ" || shipmentType === "ES" || shipmentType === "R"
            ? 3
            : 4;
        return {
          status: "purchase_confirmed",
          step: lastStep,
          shouldUpdateShipment: true,
        };
      case "CLAIM_REJECT":
        return { status: "claim_rejected", shouldUpdateShipment: false };

      case "SIMULATE_NEXT": {
        // [v14.2] 교환 수거(EQ)가 step 3(검수완료)에 도달하면 시뮬레이션 정지
        // 관리자가 수동으로 PREPARE_RESHIP을 실행해야 다음 페이즈(ES)로 넘어감
        if (shipmentType === "EQ" && currentStep >= 3) {
          console.log(
            "[Policy] 교환 회수 완료 → 시뮬레이션 정지 (관리자 수동 전환 대기)",
          );
          return { shouldUpdateShipment: false };
        }

        const nextStep = currentStep + 1;
        const maxStep = this.getMaxStepForType(shipmentType);

        // [v13.20] 단계별 종료(Phase Finalization): 최대 단계 도달 시 시뮬레이션 정지
        if (nextStep > maxStep) {
          console.log(
            `[Policy] 송장(${shipmentType}) 최대 단계(${maxStep}) 도달, 전진 정지`,
          );
          return { shouldUpdateShipment: false };
        }

        const nextStatus = this.getStatusFromIndex(nextStep, shipmentType);

        // [v13.7] 정밀 제어: 수거 송장(EQ)일 때만 재발송 송장(ES) 발급을 허용합니다.
        const requiresNewShipment =
          shipmentType === "EQ" && nextStep === 4 ? "ES" : "none";

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
    else if (shipmentType === "EQ")
      mapping = this.ORDER_TO_EXCHANGE_PICKUP_INDEX;
    else if (shipmentType === "ES")
      mapping = this.ORDER_TO_EXCHANGE_RESHIP_INDEX;
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
