/**
 * ═══════════════════════════════════════════════════════════════
 * [v9.1] 물류 서비스 (Shared/Client Safe)
 * ═══════════════════════════════════════════════════════════════
 * - 송장 번호 DNA 파싱 기반의 지능형 경로 선택 로직 도입
 * - S(Standard), R(Return), E(Exchange)에 따른 자동 패스 할당
 * - 클라이언트 빌드 에러 방지를 위해 Admin SDK 완전 배제
 */

import { db } from "@/lib/firebase";
import {
  doc, getDoc, setDoc,
  collection, query, where, getDocs
} from "firebase/firestore";

// ─── 타입 정의 ───────────────────────────────────────────────

export interface PathStep {
  location: string;
  status: string;
  statusLabel: string; // [v9.1] UI 표시용 한글 라벨 추가
  message: string;     // [v9.1] 상세 메시지
  estimatedTime: string;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  carrierCode: string;
  trackingNumber: string;
  status: "preparing" | "shipping" | "delivered" | "returning" | "returned";
  type: "S" | "R" | "E"; // [v9.1] 기존 설계 기반 타입 (Standard, Return, Exchange)
  currentStep: number;
  path: PathStep[];
  senderAddress: string;
  receiverAddress: string;
  driver: {
    name: string;
    contact: string;
    vehicle: string;
  };
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export const SHIPMENTS_COL = "shipments";

// ─── 지능형 배송 경로 (Milestones) ───────────────────────────────

// [S/E] 표준/교환 배송 경로 (6단계)
export const MOCK_LOGISTICS_PATH: PathStep[] = [
  { location: "판매처 창고", status: "preparing", statusLabel: "상품인수/접수", message: "상품을 확인하고 발송 준비를 완료했습니다.", estimatedTime: "" },
  { location: "곤지암 HUB", status: "shipping", statusLabel: "간선하차", message: "분류 센터에 상품이 도착했습니다.", estimatedTime: "" },
  { location: "곤지암 HUB", status: "shipping", statusLabel: "간선상차", message: "분류 완료 후 목적지 터미널로 발송되었습니다.", estimatedTime: "" },
  { location: "부천 터미널", status: "shipping", statusLabel: "터미널도착", message: "고객님 지역의 터미널에 도착하였습니다.", estimatedTime: "" },
  { location: "인천 강화군", status: "shipping", statusLabel: "배송출발", message: "배송 기사가 고객님께 상품을 배달 중입니다.", estimatedTime: "" },
  { location: "고객님 자택", status: "delivered", statusLabel: "배송완료", message: "상품 배송이 완료되었습니다. 감사합니다.", estimatedTime: "" },
];

// [R] 반품 수거 경로 (4단계)
export const MOCK_RETURN_PATH: PathStep[] = [
  { location: "고객님 자택", status: "returning", statusLabel: "반품접수", message: "반품 접수가 정상적으로 완료되었습니다.", estimatedTime: "" },
  { location: "고객님 자택", status: "returning", statusLabel: "수거지시", message: "기사님이 수거를 위해 방문할 예정입니다.", estimatedTime: "" },
  { location: "인천 강화군", status: "returning", statusLabel: "반송중", message: "고객님으로부터 상품을 수령하여 반송 센터로 이동 중입니다.", estimatedTime: "" },
  { location: "판매처 창고", status: "returned", statusLabel: "반송완료", message: "상품이 판매처에 정상적으로 입고되었습니다.", estimatedTime: "" },
];

// ─── 유틸리티 함수 ───────────────────────────────────────────

/** 송장 번호에서 타입을 추출 (MOCK-S... -> S) */
export function getShipmentTypeFromTracking(trackingNumber: string): "S" | "R" | "E" {
  if (trackingNumber.startsWith("MOCK-R")) return "R";
  if (trackingNumber.startsWith("MOCK-E")) return "E";
  return "S"; // 기본은 Standard
}

export function applyRevealFilter(path: PathStep[]) {
  const revealed = path.filter(p => !!p.estimatedTime);
  const pending = path.filter(p => !p.estimatedTime);
  return { revealed, pending };
}

export function generateDriver() {
  const names = ["김철수", "이영희", "박배송", "최기사"];
  const vehicles = ["1톤 탑차 (12가 3456)", "전기 트럭 (34나 7890)", "오토바이 (인천 1234)"];
  return {
    name: names[Math.floor(Math.random() * names.length)],
    contact: `010-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    vehicle: vehicles[Math.floor(Math.random() * vehicles.length)],
  };
}

// ─── 클라이언트 전용 데이터 함수 (No Admin SDK) ──────────────────

/** 주문과 연결된 새로운 Shipment 생성 (송장 기반 자동 경로 선택) */
export async function initShipment(params: {
  trackingNumber: string;
  carrierCode: string;
  orderId: string;
  senderAddress: string;
  receiverAddress: string;
}): Promise<Shipment> {
  const now = new Date();
  const type = getShipmentTypeFromTracking(params.trackingNumber);
  
  // 송장 타입에 따른 경로 자동 선택
  const basePath = type === "R" ? MOCK_RETURN_PATH : MOCK_LOGISTICS_PATH;
  
  const path: PathStep[] = basePath.map((p, idx) => ({
    ...p,
    estimatedTime: idx === 0 ? now.toISOString() : "",
  }));

  const shipment: Shipment = {
    shipmentId: params.trackingNumber,
    orderId: params.orderId,
    carrierCode: params.carrierCode,
    trackingNumber: params.trackingNumber,
    status: type === "R" ? "returning" : "shipping",
    type,
    currentStep: 0,
    path,
    senderAddress: params.senderAddress,
    receiverAddress: params.receiverAddress,
    driver: generateDriver(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await setDoc(doc(db, SHIPMENTS_COL, params.trackingNumber), shipment);
  return shipment;
}

/** Shipment 조회 (Client SDK 전용) */
export async function getShipment(shipmentId: string): Promise<Shipment | null> {
  const snap = await getDoc(doc(db, SHIPMENTS_COL, shipmentId));
  return snap.exists() ? ({ shipmentId: snap.id, ...snap.data() } as Shipment) : null;
}

/** 특정 주문과 연결된 모든 배송 정보 조회 (히스토리용) */
export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const q = query(collection(db, SHIPMENTS_COL), where("orderId", "==", orderId));
  const querySnapshot = await getDocs(q);
  const shipments: Shipment[] = [];
  querySnapshot.forEach((doc) => {
    shipments.push({ shipmentId: doc.id, ...doc.data() } as Shipment);
  });
  return shipments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
