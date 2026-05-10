import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  type: "S" | "R" | "E";
  currentStep: number;
  path: PathStep[];
  senderAddress: string;
  receiverAddress: string;
  createdAt: string;
  updatedAt: string;
}

// [v9.30] 마스터 표준 배송 경로 (5단계 정석)
export const MOCK_STANDARD_PATH: PathStep[] = [
  { location: "결제 시스템", status: "preparing", statusLabel: "결제완료", message: "결제가 정상적으로 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "판매처 창고", status: "preparing", statusLabel: "상품준비", message: "판매자가 상품을 검수하고 발송을 준비 중입니다.", estimatedTime: "", condition: "normal" },
  { location: "지역 터미널", status: "shipping", statusLabel: "배송중", message: "상품이 고객님 지역으로 이동 중입니다.", estimatedTime: "", condition: "normal" },
  { location: "고객님 댁", status: "delivered", statusLabel: "배송완료", message: "배송이 완료되었습니다. 이용해주셔서 감사합니다.", estimatedTime: "", condition: "normal" },
  { location: "주문 종료", status: "delivered", statusLabel: "구매확정", message: "구매가 확정되어 거래가 종료되었습니다.", estimatedTime: "", condition: "normal" }
];

// [v9.30] 마스터 교환 배송 경로 (6단계 정석)
export const MOCK_EXCHANGE_PATH: PathStep[] = [
  { location: "고객님 자택", status: "preparing", statusLabel: "교환접수", message: "교환을 위한 반품 접수가 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "수거지 인근", status: "shipping", statusLabel: "수거중", message: "기사님이 상품 수거를 위해 방문 예정입니다.", estimatedTime: "", condition: "normal" },
  { location: "수거지", status: "shipping", statusLabel: "수거완료", message: "판매처로 상품 수거가 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "검수 센터", status: "shipping", statusLabel: "검수중", message: "반품 상품의 상태를 정밀 확인 중입니다.", estimatedTime: "", condition: "normal" },
  { location: "분류 센터", status: "shipping", statusLabel: "교환배송", message: "새 상품이 고객님께 재발송되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "고객님 댁", status: "exchange_completed", statusLabel: "배송완료", message: "교환 상품 배송이 최종 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "주문 종료", status: "purchase_confirmed", statusLabel: "구매확정", message: "교환 거래가 최종 종료되었습니다. 이용해주셔서 감사합니다.", estimatedTime: "", condition: "normal" }
];

// [v9.30] 마스터 반품 수거 경로 (4단계)
export const MOCK_RETURN_PATH: PathStep[] = [
  { location: "고객님 자택", status: "preparing", statusLabel: "반품접수", message: "반품 접수가 정상적으로 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "수거지 인근", status: "shipping", statusLabel: "수거중", message: "기사님이 수거를 위해 이동 중입니다.", estimatedTime: "", condition: "normal" },
  { location: "수거지", status: "shipping", statusLabel: "수거완료", message: "상품 수거가 완료되었습니다.", estimatedTime: "", condition: "normal" },
  { location: "판매처", status: "returned", statusLabel: "반품완료", message: "판매처 입고 확인 후 반품이 완료되었습니다.", estimatedTime: "", condition: "normal" }
];

export function getShipmentTypeFromTracking(trackingNumber: string): "S" | "R" | "E" {
  if (trackingNumber.includes("-R")) return "R";
  if (trackingNumber.includes("-E")) return "E";
  return "S";
}

// [v11.20] 지능형 허브 매핑 (Address to Hub)
export function getHubMapping(address: string): { hub: string, terminal: string } {
  const addr = address || "";
  if (/서울|경기|인천/.test(addr)) return { hub: "곤지암 HUB", terminal: "강남 터미널" };
  if (/충청|강원|대전|세종/.test(addr)) return { hub: "옥천 HUB", terminal: "대전 터미널" };
  if (/전라|광주|전주|목포/.test(addr)) return { hub: "장성 HUB", terminal: "광주 터미널" };
  if (/경상|부산|대구|울산|창원/.test(addr)) return { hub: "칠곡 HUB", terminal: "부산 터미널" };
  if (/제주/.test(addr)) return { hub: "제주 HUB", terminal: "제주 터미널" };
  return { hub: "옥천 HUB", terminal: "물류 터미널" };
}

// [v11.20] 결정론적 해시 엔진
export function getHashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// [v11.21] 확장 기사 프로필
export function generateDeterministicInfo(trackingNumber: string) {
  const hash = getHashString(trackingNumber);
  const names = ["김철수", "이영희", "박지민", "최동훈", "정수진"];
  const vehicles = ["경기 82 바 ", "서울 11 가 ", "인천 45 다 ", "부산 99 라 ", "충남 33 마 "];
  
  const name = names[hash % names.length];
  const vehicle = vehicles[hash % vehicles.length] + (1000 + (hash % 9000)).toString();
  const phone = `010-${1000 + (hash % 9000)}-${1000 + ((hash / 10) % 9000).toFixed(0)}`;
  
  // 사고(Issue) 발생 확률: 5%, 지연(Delayed) 확률: 10%
  const rand = hash % 100;
  let condition: "normal" | "delayed" | "issue" = "normal";
  if (rand < 5) condition = "issue";
  else if (rand < 15) condition = "delayed";

  return { name, vehicle, phone, condition };
}

export async function getShipment(shipmentId: string): Promise<Shipment | null> {
  const snap = await getDoc(doc(db, SHIPMENTS_COL, shipmentId));
  return snap.exists() ? ({ shipmentId: snap.id, ...snap.data() } as Shipment) : null;
}

export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const q = query(collection(db, SHIPMENTS_COL), where("orderId", "==", orderId));
  const snap = await getDocs(q);
  const list: Shipment[] = [];
  snap.forEach(d => list.push({ shipmentId: d.id, ...d.data() } as Shipment));
  return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function applyRevealFilter(path: PathStep[]) {
  const now = new Date();
  const revealed = path.filter(p => p.estimatedTime && new Date(p.estimatedTime) <= now);
  const pending = path.filter(p => !p.estimatedTime || new Date(p.estimatedTime) > now);
  return { revealed, pending };
}

export async function createMockShipment(params: {
  trackingNumber: string;
  carrierCode: string;
  orderId: string;
  senderAddress: string;
  receiverAddress: string;
  targetStep: number;
}): Promise<Shipment> {
  const now = new Date();
  const type = getShipmentTypeFromTracking(params.trackingNumber);
  
  let basePath = MOCK_STANDARD_PATH;
  if (type === "R") basePath = MOCK_RETURN_PATH;
  if (type === "E") basePath = MOCK_EXCHANGE_PATH;

  const { LogisticsStatusResolver } = await import("./LogisticsStatusResolver");
  const initialStatus = LogisticsStatusResolver.getShipmentStatusForIndex(params.targetStep, type);
  
  // [v11.20] 지능형 데이터 매핑 적용
  const { hub, terminal } = getHubMapping(params.receiverAddress);
  const driverInfo = generateDeterministicInfo(params.trackingNumber);
  
  const path: PathStep[] = basePath.map((p, idx) => {
    let newLocation = p.location;
    let newMessage = p.message;
    let stepCondition = p.condition || "normal";
    
    // 허브 매핑 적용
    if (newLocation === "지역 터미널" || newLocation === "분류 센터") {
        newLocation = `${hub} ➡️ ${terminal}`;
    }
    
    // 기사 정보 적용
    if (newLocation === "고객님 댁" || newLocation === "고객님 자택" || newLocation === "수거지 인근") {
        newMessage = `${p.message} (담당: ${driverInfo.name} 기사님, ${driverInfo.vehicle}, ${driverInfo.phone})`;
    }
    
    // 시뮬레이션 예외 상황 적용 (배송중/수거중 단계에만 적용)
    if (p.status === "shipping" && driverInfo.condition !== "normal") {
        stepCondition = driverInfo.condition;
        if (stepCondition === "delayed") newMessage += " [물류량 증가로 인한 지연 발생]";
        if (stepCondition === "issue") newMessage += " [기상 악화로 인한 배송 보류]";
    }

    // [v11.20] Reveal 시간 스케줄링 (미래 시간 배정)
    let estTime = new Date(now.getTime());
    if (idx <= params.targetStep) {
        // 지나간/현재 단계: 현재 시각보다 과거로 세팅
        estTime = new Date(now.getTime() - (params.targetStep - idx) * 3600000); 
    } else {
        // 미래 예정 단계: 한 단계당 4시간씩 미래로 세팅 (빠른 시뮬레이션을 위해 4h로 설정)
        // 지연 상태면 24시간 추가
        let delayOffset = stepCondition === "delayed" ? 24 : stepCondition === "issue" ? 48 : 0;
        estTime = new Date(now.getTime() + ((idx - params.targetStep) * 4 + delayOffset) * 3600000);
    }
    
    return {
      ...p,
      location: newLocation,
      message: newMessage,
      estimatedTime: estTime.toISOString(),
      condition: stepCondition
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
