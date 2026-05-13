import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const SHIPMENTS_COL = "shipments";

export interface PathStep {
  location: string;
  status: string;
  statusLabel: string;
  message: string;
  estimatedTime: string;
  condition?: "normal" | "delayed" | "issue";
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  carrierCode: string;
  trackingNumber: string;
  status: string;
  type: "S" | "R" | "EQ" | "ES";
  currentStep: number;
  path: PathStep[];
  senderAddress: string;
  receiverAddress: string;
  createdAt: string;
  updatedAt: string;
}

// [v9.30] 마스터 표준 배송 경로 (5단계 정석)
export const MOCK_STANDARD_PATH: PathStep[] = [
  {
    location: "결제 시스템",
    status: "payment_complete",
    statusLabel: "결제완료",
    message: "결제가 정상적으로 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "판매처 창고",
    status: "preparing",
    statusLabel: "상품준비",
    message: "판매자가 상품을 검수하고 발송을 준비 중입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "지역 터미널",
    status: "shipping",
    statusLabel: "배송중",
    message: "상품이 지역 터미널로 이동 중입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "고객님 댁",
    status: "delivered",
    statusLabel: "배송완료",
    message: "배송이 완료되었습니다. 이용해주셔서 감사합니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "주문 종료",
    status: "purchase_confirmed",
    statusLabel: "구매확정",
    message: "구매가 확정되어 거래가 종료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
];

// [v13.20] 4+4 Phase Finalization: 교환 수거 경로 (EQ 전용 - 4단계)
export const MOCK_EXCHANGE_PICKUP_PATH: PathStep[] = [
  {
    location: "고객님 자택",
    status: "exchange_requested",
    statusLabel: "교환접수",
    message: "교환을 위한 상품 회수 접수가 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "수거지 인근",
    status: "returning",
    statusLabel: "수거중",
    message: "기사님이 교환 상품 수거를 위해 방문 예정입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "수거지",
    status: "returned",
    statusLabel: "수거완료",
    message: "회수 상품의 수거가 완료되어 검수 센터로 입고 중입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "검수 센터",
    status: "inspection_completed",
    statusLabel: "검수완료",
    message: "회수된 상품의 상태 확인이 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
];

// [v13.20] 4+4 Phase Finalization: 교환 재발송 경로 (ES 전용 - 4단계)
export const MOCK_EXCHANGE_RESHIP_PATH: PathStep[] = [
  {
    location: "판매처 창고",
    status: "exchange_preparing",
    statusLabel: "상품준비",
    message: "검수 완료 후 새 상품을 포장하고 있습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "분류 센터",
    status: "reshipping",
    statusLabel: "교환배송",
    message: "새 상품이 고객님께 재발송되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "고객님 댁",
    status: "exchange_completed",
    statusLabel: "배송완료",
    message: "교환 상품 배송이 최종 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "주문 종료",
    status: "purchase_confirmed",
    statusLabel: "구매확정",
    message: "교환 거래가 최종 종료되었습니다. 이용해주셔서 감사합니다.",
    estimatedTime: "",
    condition: "normal",
  },
];

// [v9.30] 마스터 반품 수거 경로 (4단계)
export const MOCK_RETURN_PATH: PathStep[] = [
  {
    location: "고객님 자택",
    status: "return_pending",
    statusLabel: "반품접수",
    message: "반품 접수가 정상적으로 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "수거지 인근",
    status: "returning",
    statusLabel: "수거중",
    message: "기사님이 상품 수거를 위해 이동 중입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "수거지",
    status: "returned",
    statusLabel: "수거완료",
    message: "상품 수거가 완료되어 허브로 이동 중입니다.",
    estimatedTime: "",
    condition: "normal",
  },
  {
    location: "판매처",
    status: "return_completed",
    statusLabel: "반품완료",
    message: "판매처 입고 확인 후 반품 처리가 최종 완료되었습니다.",
    estimatedTime: "",
    condition: "normal",
  },
];

export function getShipmentTypeFromTracking(
  trackingNumber: string,
): "S" | "R" | "EQ" | "ES" {
  if (trackingNumber.startsWith("MOCK-EQ")) return "EQ";
  if (trackingNumber.startsWith("MOCK-ES")) return "ES";
  if (trackingNumber.startsWith("MOCK-R")) return "R";
  return "S";
}

// [v12.5] 초지능형 주소 판별 엔진 (AddressResolver)
export function resolveAddress(address: string) {
  const addr = address || "";
  let isIsland = false;
  let transitMode: "LAND" | "SEA" | "AIR" = "LAND";
  let hub = "옥천 HUB";
  let terminal = "지역 터미널";
  let portOrAir = "";

  if (/울릉|독도/.test(addr)) {
    isIsland = true;
    transitMode = "SEA";
    hub = "옥천 HUB";
    portOrAir = "포항항";
    terminal = "울릉 터미널";
  } else if (/백령|연평|덕적|신안|완도|진도|거문|흑산/.test(addr)) {
    isIsland = true;
    transitMode = "SEA";
    hub = "장성 HUB";
    portOrAir = "목포항";
    terminal = "도서 터미널";
  } else if (/제주|서귀포/.test(addr)) {
    isIsland = true;
    transitMode = "SEA";
    hub = "곤지암 HUB";
    portOrAir = "목포항";
    terminal = "제주 터미널";
  } else if (/서울|경기|인천/.test(addr)) {
    hub = "곤지암 HUB";
    terminal = "강남 터미널";
  } else if (/충청|강원|대전|세종/.test(addr)) {
    hub = "옥천 HUB";
    terminal = "대전 터미널";
  } else if (/전라|광주|전주|목포/.test(addr)) {
    hub = "장성 HUB";
    terminal = "광주 터미널";
  } else if (/경상|부산|대구|울산|창원/.test(addr)) {
    hub = "칠곡 HUB";
    terminal = "부산 터미널";
  }

  return { isIsland, transitMode, hub, terminal, portOrAir };
}

// [v11.20] 결정론적 해시 엔진
export function getHashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// [v12.5] 상황별 시나리오 빌더 (계절/기상 연동)
export function buildScenario(
  hash: number,
  transitMode: string,
  isIsland: boolean,
) {
  const month = new Date().getMonth() + 1;
  let condition: "normal" | "delayed" | "issue" = "normal";
  let message = "";
  let delayHours = 0;

  const rand = hash % 100;

  if (isIsland && transitMode === "SEA") delayHours += 24; // 도서지역 기본 패널티

  if (month === 12 || month === 1 || month === 2) {
    // 겨울
    if (rand < 10) {
      condition = "delayed";
      message = "❄️ [기상청] 폭설로 인한 제설 작업으로 고속도로 서행 운행 중";
      delayHours += 24;
    } else if (rand < 13) {
      condition = "issue";
      message =
        "🚨 [재난특보] 주요 도로 빙판길(블랙아이스) 사고로 터미널 진입 전면 통제";
      delayHours += 48;
    }
  } else if (month >= 6 && month <= 8) {
    // 여름
    if (transitMode === "SEA" && rand < 20) {
      condition = "issue";
      message =
        "🌊 [해상예보] 태풍/풍랑 주의보 발효로 인한 전 여객선/화물선 결항";
      delayHours += 48;
    } else if (rand < 10) {
      condition = "delayed";
      message =
        "🌧️ [기상청] 집중호우로 인한 하천 범람 및 도로 통제로 우회 배송 중";
      delayHours += 12;
    }
  } else {
    // 봄/가을
    if (transitMode === "SEA" && rand < 8) {
      condition = "delayed";
      message = "🌫️ [해상예보] 해상 짙은 안개(농무)로 인한 선박 출항 지연";
      delayHours += 12;
    } else if (rand < 5) {
      condition = "delayed";
      message =
        "📦 [물류공지] 명절/연휴 특수 물량 폭증으로 인한 터미널 상차 대기";
      delayHours += 12;
    }
  }

  return { condition, message, delayHours };
}

export function generateDeterministicInfo(trackingNumber: string) {
  const hash = getHashString(trackingNumber);
  const names = ["김철수", "이영희", "박지민", "최동훈", "정수진"];
  const vehicles = [
    "경기 82 바 ",
    "서울 11 가 ",
    "인천 45 다 ",
    "부산 99 라 ",
    "충남 33 마 ",
  ];
  const name = names[hash % names.length];
  const vehicle =
    vehicles[hash % vehicles.length] + (1000 + (hash % 9000)).toString();
  const phone = `010-${1000 + (hash % 9000)}-${1000 + ((hash / 10) % 9000).toFixed(0)}`;
  return { name, vehicle, phone };
}

export async function getShipment(
  shipmentId: string,
): Promise<Shipment | null> {
  const { db } = await import("@/lib/firebase");
  const snap = await getDoc(doc(db, SHIPMENTS_COL, shipmentId));
  return snap.exists()
    ? ({ shipmentId: snap.id, ...snap.data() } as Shipment)
    : null;
}

export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const { db } = await import("@/lib/firebase");
  const { orderBy } = await import("firebase/firestore");
  
  const q = query(
    collection(db, SHIPMENTS_COL), 
    where("orderId", "==", orderId),
    orderBy("createdAt", "desc") // [v13.40] DB 레벨 정렬로 속도 극대화
  );
  
  const snap = await getDocs(q);
  const list: Shipment[] = [];
  snap.forEach((d) => list.push({ shipmentId: d.id, ...d.data() } as Shipment));
  return list;
}

export function applyRevealFilter(path: PathStep[]) {
  const now = new Date();
  const revealed = path.filter(
    (p) => p.estimatedTime && new Date(p.estimatedTime) <= now,
  );
  const pending = path.filter(
    (p) => !p.estimatedTime || new Date(p.estimatedTime) > now,
  );
  return { revealed, pending };
}

export async function createMockShipment(params: {
  trackingNumber: string;
  carrierCode: string;
  orderId: string;
  senderAddress: string;
  receiverAddress: string;
  targetStep: number;
  shipmentType?: "S" | "R" | "EQ" | "ES";
}): Promise<Shipment> {
  const { db } = await import("@/lib/firebase");
  const now = new Date();
  const type =
    params.shipmentType || getShipmentTypeFromTracking(params.trackingNumber);

  // [v13.20] 4+4 Phase Finalization: 송장 타입별 전용 경로 할당
  let basePath = MOCK_STANDARD_PATH;
  if (type === "R") basePath = MOCK_RETURN_PATH;
  if (type === "EQ") basePath = MOCK_EXCHANGE_PICKUP_PATH;
  if (type === "ES") basePath = MOCK_EXCHANGE_RESHIP_PATH;

  const { LogisticsStatusResolver } = await import("./LogisticsStatusResolver");
  const initialStatus = LogisticsStatusResolver.getShipmentStatusForIndex(
    params.targetStep,
    type,
  );

  // [v12.5] 지능형 데이터 및 시나리오 매핑 (출발지/도착지 동시 고려)
  const r = resolveAddress(params.receiverAddress); // 목적지 (고객)
  const s = resolveAddress(params.senderAddress); // 출발지 (쇼핑몰)

  const driverInfo = generateDeterministicInfo(params.trackingNumber);
  const scenario = buildScenario(
    getHashString(params.trackingNumber),
    r.transitMode,
    r.isIsland,
  );

  const path: PathStep[] = basePath.map((p, idx) => {
    let newLocation = p.location;
    let newMessage = p.message;
    let stepCondition: "normal" | "delayed" | "issue" = "normal";

    // [v12.5] 다중 노드 융합 (출발지 허브 ➡️ 도착지 허브 연동)
    if (
      p.status === "shipping" ||
      p.status === "reshipping" ||
      p.status === "returning"
    ) {
      if (r.isIsland) {
        newLocation =
          p.status === "returning"
            ? `${r.terminal} ➡️ ${r.portOrAir} ➡️ ${s.hub}`
            : `${s.hub} ➡️ ${r.portOrAir} ➡️ ${r.terminal}`;
      } else {
        const hubs = s.hub === r.hub ? s.hub : `${s.hub} ➡️ ${r.hub}`;
        newLocation =
          p.status === "returning"
            ? `지역 수거지 ➡️ ${hubs}`
            : `${hubs} ➡️ ${r.terminal}`;
      }

      if (scenario.condition !== "normal") {
        stepCondition = scenario.condition;
        newMessage = `${newMessage} \n${scenario.message}`;
      } else if (r.isIsland && r.transitMode === "SEA") {
        newMessage = `${newMessage} \n⚓ 항만 특수 물류망을 통해 안전하게 해상 운송 중입니다.`;
      }
    }

    // 기사 정보 주입
    if (
      newLocation === "고객님 댁" ||
      newLocation === "고객님 자택" ||
      newLocation === "수거지 인근"
    ) {
      newMessage = `${p.message} (담당: ${driverInfo.name} 기사님, ${driverInfo.vehicle}, ${driverInfo.phone})`;
    }

    // [v13.20] 리얼 모드 보호 가드: MOCK이 아닌 경우 가상 타임스탬프를 생성하지 않음
    let estTime = new Date(now.getTime());
    const isMock =
      params.carrierCode === "MOCK" ||
      params.trackingNumber.startsWith("MOCK-");
    if (!isMock) {
      // 리얼 모드: 타임스탬프를 현재 시각으로 고정 (시뮬레이션 비활성화)
      estTime = new Date(now.getTime());
    } else if (idx <= params.targetStep) {
      estTime = new Date(now.getTime() - (params.targetStep - idx) * 3600000);
    } else {
      estTime = new Date(
        now.getTime() +
          ((idx - params.targetStep) * 4 + scenario.delayHours) * 3600000,
      );
    }

    return {
      ...p,
      location: newLocation,
      message: newMessage,
      estimatedTime: estTime.toISOString(),
      condition: stepCondition,
    };
  });

  const shipment: Shipment = {
    shipmentId: params.trackingNumber,
    orderId: params.orderId,
    carrierCode: params.carrierCode,
    trackingNumber: params.trackingNumber,
    status: initialStatus,
    type,
    currentStep: params.targetStep,
    path,
    senderAddress: params.senderAddress,
    receiverAddress: params.receiverAddress,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return shipment;
}
