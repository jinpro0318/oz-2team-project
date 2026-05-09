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
  { location: "결제 시스템", status: "preparing", statusLabel: "결제완료", message: "결제가 정상적으로 완료되었습니다.", estimatedTime: "" },
  { location: "판매처 창고", status: "preparing", statusLabel: "상품준비", message: "판매자가 상품을 검수하고 발송을 준비 중입니다.", estimatedTime: "" },
  { location: "지역 터미널", status: "shipping", statusLabel: "배송중", message: "상품이 고객님 지역으로 이동 중입니다.", estimatedTime: "" },
  { location: "고객님 댁", status: "delivered", statusLabel: "배송완료", message: "배송이 완료되었습니다. 이용해주셔서 감사합니다.", estimatedTime: "" },
  { location: "주문 종료", status: "delivered", statusLabel: "구매확정", message: "구매가 확정되어 거래가 종료되었습니다.", estimatedTime: "" }
];

// [v9.30] 마스터 교환 배송 경로 (6단계 정석)
export const MOCK_EXCHANGE_PATH: PathStep[] = [
  { location: "고객님 자택", status: "preparing", statusLabel: "교환접수", message: "교환을 위한 반품 접수가 완료되었습니다.", estimatedTime: "" },
  { location: "수거지 인근", status: "shipping", statusLabel: "수거중", message: "기사님이 상품 수거를 위해 방문 예정입니다.", estimatedTime: "" },
  { location: "수거지", status: "shipping", statusLabel: "수거완료", message: "판매처로 상품 수거가 완료되었습니다.", estimatedTime: "" },
  { location: "검수 센터", status: "shipping", statusLabel: "검수중", message: "반품 상품의 상태를 정밀 확인 중입니다.", estimatedTime: "" },
  { location: "분류 센터", status: "shipping", statusLabel: "교환배송", message: "새 상품이 고객님께 재발송되었습니다.", estimatedTime: "" },
  { location: "고객님 댁", status: "exchange_completed", statusLabel: "교환완료", message: "교환 상품 배송이 최종 완료되었습니다.", estimatedTime: "" }
];

// [v9.30] 마스터 반품 수거 경로 (4단계)
export const MOCK_RETURN_PATH: PathStep[] = [
  { location: "고객님 자택", status: "preparing", statusLabel: "반품접수", message: "반품 접수가 정상적으로 완료되었습니다.", estimatedTime: "" },
  { location: "수거지 인근", status: "shipping", statusLabel: "수거중", message: "기사님이 수거를 위해 이동 중입니다.", estimatedTime: "" },
  { location: "수거지", status: "shipping", statusLabel: "수거완료", message: "상품 수거가 완료되었습니다.", estimatedTime: "" },
  { location: "판매처", status: "returned", statusLabel: "반품완료", message: "판매처 입고 확인 후 반품이 완료되었습니다.", estimatedTime: "" }
];

export function getShipmentTypeFromTracking(trackingNumber: string): "S" | "R" | "E" {
  if (trackingNumber.includes("-R")) return "R";
  if (trackingNumber.includes("-E")) return "E";
  return "S";
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
}): Promise<Shipment> {
  const now = new Date();
  const type = getShipmentTypeFromTracking(params.trackingNumber);
  
  let basePath = MOCK_STANDARD_PATH;
  if (type === "R") basePath = MOCK_RETURN_PATH;
  if (type === "E") basePath = MOCK_EXCHANGE_PATH;
  
  const path: PathStep[] = basePath.map((p, idx) => ({
    ...p,
    estimatedTime: idx === 0 ? now.toISOString() : "",
  }));

  const shipment: Shipment = {
    shipmentId: params.trackingNumber,
    orderId: params.orderId,
    carrierCode: params.carrierCode,
    trackingNumber: params.trackingNumber,
    status: type === "S" ? "shipping" : (type === "R" ? "returning" : "exchange_preparing"),
    type,
    currentStep: 0,
    path,
    senderAddress: params.senderAddress,
    receiverAddress: params.receiverAddress,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await setDoc(doc(db, SHIPMENTS_COL, params.trackingNumber), shipment);
  return shipment;
}
