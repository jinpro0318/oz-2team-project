/**
 * ═══════════════════════════════════════════════════════════════
 * [v9.0 §4/§8/§9/§15/§16] 코드 로지스틱스 지능형 물류 서비스
 * ═══════════════════════════════════════════════════════════════
 * - Hub Map 기반 경로 자동 생성
 * - 해시 기반 결정론적 기사/차량/연락처 데이터
 * - Temporal Reveal Engine (estimatedTime 기반 노출 필터)
 * - Firestore Transaction 기반 Skip 로직
 */

import { db } from "@/lib/firebase";
import {
  doc, getDoc, setDoc, runTransaction,
  collection, query, where, getDocs, updateDoc,
} from "firebase/firestore";
import type { MOCKShipmentType } from "@/lib/utils/order";

// ─── 타입 정의 ───────────────────────────────────────────────

export interface PathStep {
  step: number;
  location: string;
  statusLabel: string;
  message: string;
  estimatedTime: string; // ISO 8601 절대 시각
  durationHours: number; // 이전 단계로부터의 소요 시간
}

export interface DriverInfo {
  name: string;
  vehicle: string;
  contact: string;
}

export interface Shipment {
  shipmentId: string;   // = 송장번호 (MOCK-S260507-A1B2)
  orderId: string;
  type: MOCKShipmentType;
  status: 'READY' | 'IN_TRANSIT' | 'DELIVERED';
  senderAddress: string;
  receiverAddress: string;
  path: PathStep[];
  currentStep: number;
  driver: DriverInfo;
  createdAt: string;
  deliveredAt?: string;
}

// ─── 상수: 권역별 허브 매핑 (§8.1) ─────────────────────────

type RegionKey = 'SEOUL' | 'GANGWON' | 'CHUNGCHEONG' | 'JEOLLA' | 'GYEONGSANG' | 'JEJU';

const HUB_MAP: Record<RegionKey, { hub: string; terminals: string[] }> = {
  SEOUL:       { hub: "곤지암 HUB", terminals: ["군포 터미널", "부천 터미널", "성남 터미널", "인천 터미널", "고양 터미널", "수원 터미널"] },
  GANGWON:     { hub: "원주 HUB",   terminals: ["춘천 터미널", "강릉 터미널", "원주 터미널"] },
  CHUNGCHEONG: { hub: "옥천 HUB",   terminals: ["대전 터미널", "청주 터미널", "세종 터미널", "천안 터미널"] },
  JEOLLA:      { hub: "장성 HUB",   terminals: ["광주 터미널", "전주 터미널", "목포 터미널", "여수 터미널"] },
  GYEONGSANG:  { hub: "칠곡 HUB",   terminals: ["부산 터미널", "대구 터미널", "창원 터미널", "울산 터미널", "포항 터미널"] },
  JEJU:        { hub: "제주 HUB",   terminals: ["제주 터미널"] },
};

const REGION_KEYWORDS: Record<RegionKey, string[]> = {
  SEOUL:       ["서울", "인천", "경기", "고양", "성남", "수원", "부천", "안양", "용인", "화성", "파주", "김포", "광명", "시흥", "하남", "구리", "남양주", "의정부", "평택"],
  GANGWON:     ["강원", "춘천", "원주", "강릉", "속초", "동해", "삼척", "태백"],
  CHUNGCHEONG: ["대전", "세종", "충북", "충남", "청주", "천안", "아산", "공주", "논산", "제천", "충주"],
  JEOLLA:      ["광주", "전북", "전남", "전주", "목포", "여수", "순천", "익산", "군산", "나주"],
  GYEONGSANG:  ["부산", "대구", "울산", "경북", "경남", "포항", "경주", "안동", "구미", "창원", "진주", "김해", "양산", "거제"],
  JEJU:        ["제주", "서귀포"],
};

// ─── 상수: 타입별 경로 템플릿 (§8.2) ───────────────────────

/** [min, max] 시간 범위 (단위: 시간) */
const STANDARD_DURATIONS: [number, number][] = [
  [0, 0],       // 1. 상품인수
  [2, 4],       // 2. 터미널입고
  [6, 12],      // 3. 간선하차
  [4, 8],       // 4. 간선상차
  [6, 12],      // 5. 터미널도착
  [1, 2],       // 6. 배송출발
  [0.5, 0.5],   // 7. 배송완료
];

const RETURN_DURATIONS: [number, number][] = [
  [0, 0],       // 1. 반품접수
  [12, 24],     // 2. 방문예정
  [2, 4],       // 3. 수거완료
  [12, 18],     // 4. HUB통과
  [6, 12],      // 5. 반품완료
];

// ─── 상수: 결정론적 기사 데이터 (§8.3 + §16.3) ─────────────

const DRIVER_NAMES = [
  "김민수", "이준호", "박성진", "최영식", "정우성",
  "강태영", "윤서현", "조현우", "한지훈", "임동혁",
  "신재영", "오승환", "황민재", "전용현", "배상윤",
];

const AREA_CODES = ["서울", "경기", "인천", "부산", "대구", "광주", "대전"];
const HANGUL_CHARS = ["가", "나", "다", "라", "마", "바", "사", "아", "자"];

// ─── 유틸리티 함수 ──────────────────────────────────────────

/** 문자열 해시 (결정론적 시드 생성용) */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 주소에서 권역 판별 */
function getRegion(address: string): RegionKey {
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some(kw => address.includes(kw))) {
      return region as RegionKey;
    }
  }
  return 'SEOUL'; // 기본값
}

/** 해시 기반 결정론적 소요 시간 계산 (0.5h 단위) */
function getDeterministicDuration(trackingNumber: string, stepIndex: number, min: number, max: number): number {
  if (min === max) return min;
  const h = hashString(trackingNumber + String(stepIndex));
  const steps = Math.floor((max - min) / 0.5);
  return min + (h % (steps + 1)) * 0.5;
}

// ─── 결정론적 기사 정보 생성 (§8.3 + §16.3) ────────────────

export function generateDriver(trackingNumber: string): DriverInfo {
  const h = hashString(trackingNumber);
  const name = DRIVER_NAMES[h % DRIVER_NAMES.length];
  const area = AREA_CODES[(h >> 4) % AREA_CODES.length];
  const num1 = String((h >> 8) % 90 + 10);
  const hangul = HANGUL_CHARS[(h >> 12) % HANGUL_CHARS.length];
  const num2 = String((h >> 16) % 9000 + 1000);
  const vehicle = `${area}${num1}${hangul} ${num2}`;
  const contact = `050-${String((h >> 20) % 9000 + 1000)}-${String((h >> 24) % 9000 + 1000)}`;
  return { name, vehicle, contact };
}

// ─── 경로 생성 (§8.2 + §16.4 스냅샷 메시지 보존) ───────────

function generatePathSteps(
  type: MOCKShipmentType,
  trackingNumber: string,
  senderAddress: string,
  receiverAddress: string,
  startTime: Date,
): PathStep[] {
  const h = hashString(trackingNumber);

  if (type === 'R') {
    // 반품 경로: 고객 → 판매처
    const customerRegion = getRegion(senderAddress);
    const hub = HUB_MAP[customerRegion];
    const terminal = hub.terminals[h % hub.terminals.length];

    const templates = [
      { location: "고객님",      statusLabel: "결제완료", message: "반품 주문이 접수되었습니다." },
      { location: "고객님 자택",  statusLabel: "반품접수", message: "고객님의 반품 신청이 정상 접수되었습니다." },
      { location: terminal,      statusLabel: "방문예정", message: "배송 기사가 상품 수거를 위해 방문할 예정입니다." },
      { location: terminal,      statusLabel: "수거완료", message: "상품 수거가 완료되어 터미널로 이동합니다." },
      { location: hub.hub,       statusLabel: "HUB통과",  message: "물류 거점을 통과하여 판매처로 이동 중입니다." },
      { location: "판매처",      statusLabel: "반품완료", message: "판매처에 상품이 도착하여 검수 중입니다." },
    ];

    let cumulativeMs = 0;
    return templates.map((t, i) => {
      const dur = i === 0 ? 0 : getDeterministicDuration(trackingNumber, i, RETURN_DURATIONS[Math.min(i-1, RETURN_DURATIONS.length-1)][0], RETURN_DURATIONS[Math.min(i-1, RETURN_DURATIONS.length-1)][1]);
      cumulativeMs += dur * 3600000;
      return { step: i, ...t, estimatedTime: new Date(startTime.getTime() + cumulativeMs).toISOString(), durationHours: dur };
    });
  }

  // 일반 배송(S) 또는 교환 재배송(E): 판매처 → 고객
  const sellerRegion = getRegion(senderAddress);
  const customerRegion = getRegion(receiverAddress);
  const sellerHub = HUB_MAP[sellerRegion];
  const customerHub = HUB_MAP[customerRegion];
  const originTerminal = sellerHub.terminals[h % sellerHub.terminals.length];
  const destTerminal = customerHub.terminals[(h >> 4) % customerHub.terminals.length];
  const localArea = receiverAddress.split(' ').slice(0, 2).join(' ') || "배송지 인근";

  const templates = [
    { location: "고객님",        statusLabel: "결제완료",   message: "주문 및 결제가 정상적으로 완료되었습니다." },
    { location: "판매처",        statusLabel: "상품인수",   message: "보내시는 분이 상품을 접수하였습니다." },
    { location: originTerminal,  statusLabel: "터미널입고", message: "물류센터로 이동하기 위해 터미널에 입고되었습니다." },
    { location: sellerHub.hub,   statusLabel: "간선하차",   message: `${sellerHub.hub}에 도착하여 분류 작업을 시작합니다.` },
    { location: sellerHub.hub,   statusLabel: "간선상차",   message: "분류 완료 후 목적지 터미널로 발송되었습니다." },
    { location: destTerminal,    statusLabel: "터미널도착", message: "고객님 지역의 터미널에 도착하였습니다." },
    { location: localArea,       statusLabel: "배송출발",   message: "배송 기사가 고객님께 상품을 배달 중입니다." },
    { location: "고객님 자택",   statusLabel: "배송완료",   message: "상품 배송이 완료되었습니다. 감사합니다." },
  ];

  let cumulativeMs = 0;
  return templates.map((t, i) => {
    const dur = i === 0 ? 0 : getDeterministicDuration(trackingNumber, i, STANDARD_DURATIONS[Math.min(i-1, STANDARD_DURATIONS.length-1)][0], STANDARD_DURATIONS[Math.min(i-1, STANDARD_DURATIONS.length-1)][1]);
    cumulativeMs += dur * 3600000;
    return { step: i, ...t, estimatedTime: new Date(startTime.getTime() + cumulativeMs).toISOString(), durationHours: dur };
  });
}

// ═══════════════════════════════════════════════════════════════
// Firestore CRUD 함수
// ═══════════════════════════════════════════════════════════════

const SHIPMENTS_COL = "shipments";

// 서버 사이드 전용 Admin SDK 헬퍼 (최상단이 아닌 함수 내부에서 캐싱)
let cachedAdminDb: any = null;
async function getAdminDb() {
  if (typeof window === "undefined" && !cachedAdminDb) {
    const { adminDb } = await import("@/lib/firebase-admin");
    cachedAdminDb = adminDb;
  }
  return cachedAdminDb;
}

/** 신규 Shipment 생성 및 DB 저장 */
export async function initShipment(params: {
  trackingNumber: string;
  orderId: string;
  type: MOCKShipmentType;
  senderAddress: string;
  receiverAddress: string;
}): Promise<Shipment> {
  const now = new Date();
  const path = generatePathSteps(params.type, params.trackingNumber, params.senderAddress, params.receiverAddress, now);
  const driver = generateDriver(params.trackingNumber);

  const shipment: Shipment = {
    shipmentId: params.trackingNumber,
    orderId: params.orderId,
    type: params.type,
    status: 'IN_TRANSIT',
    senderAddress: params.senderAddress,
    receiverAddress: params.receiverAddress,
    path,
    currentStep: 0,
    driver,
    createdAt: now.toISOString(),
  };

  const adminDb = await getAdminDb();
  if (adminDb) {
    await adminDb.collection(SHIPMENTS_COL).doc(params.trackingNumber).set(shipment);
    return shipment;
  }

  await setDoc(doc(db, SHIPMENTS_COL, params.trackingNumber), shipment);
  return shipment;
}

/** Shipment 조회 */
export async function getShipment(shipmentId: string): Promise<Shipment | null> {
  // [v9.0 Admin 연동] 서버 사이드라면 관리자 권한으로 조회 (연결 안정성 확보)
  const adminDb = await getAdminDb();
  if (adminDb) {
    const snap = await adminDb.collection(SHIPMENTS_COL).doc(shipmentId).get();
    return snap.exists ? (snap.data() as Shipment) : null;
  }

  const snap = await getDoc(doc(db, SHIPMENTS_COL, shipmentId));
  return snap.exists() ? (snap.data() as Shipment) : null;
}

/** 주문 ID로 연결된 모든 Shipment 조회 */
export async function getShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const q = query(collection(db, SHIPMENTS_COL), where("orderId", "==", orderId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Shipment);
}

/** [v9.0 §15.3] 관리자 건너뛰기 로직 */
export async function advanceLogisticsStep(shipmentId: string): Promise<Shipment> {
  const adminDb = await getAdminDb();

  // 1. 서버 사이드 (Admin SDK) 처리
  if (adminDb) {
    return await adminDb.runTransaction(async (transaction: any) => {
      const docRef = adminDb.collection(SHIPMENTS_COL).doc(shipmentId);
      const snap = await transaction.get(docRef);

      if (!snap.exists) throw new Error("배송 정보를 찾을 수 없습니다.");
      const data = snap.data() as Shipment;

      const nextStep = data.currentStep + 1;
      if (nextStep >= data.path.length) throw new Error("이미 마지막 단계입니다.");

      const now = new Date();
      const updatedPath = [...data.path];
      
      // 타겟 단계를 현재 시각으로 고정 (실제 발생 시간 기록)
      updatedPath[nextStep].estimatedTime = now.toISOString();

      const isLastStep = nextStep === data.path.length - 1;

      const updated: Shipment = {
        ...data,
        currentStep: nextStep,
        status: isLastStep ? "delivered" : "shipping",
        path: updatedPath,
        updatedAt: now.toISOString(),
        ...(isLastStep ? { deliveredAt: now.toISOString() } : {}),
      };

      transaction.update(docRef, updated as any);
      return updated;
    });
  }

  // 2. 클라이언트 사이드 (Client SDK) 처리
  return await runTransaction(db, async (transaction) => {
    const docRef = doc(db, SHIPMENTS_COL, shipmentId);
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error("배송 정보를 찾을 수 없습니다.");
    
    const data = snap.data() as Shipment;
    const nextStep = data.currentStep + 1;
    if (nextStep >= data.path.length) throw new Error("이미 마지막 단계입니다.");

    const now = new Date();
    const updatedPath = [...data.path];
    updatedPath[nextStep].estimatedTime = now.toISOString();

    const isLastStep = nextStep === data.path.length - 1;

    const updated: Shipment = {
      ...data,
      currentStep: nextStep,
      status: isLastStep ? "delivered" : "shipping",
      path: updatedPath,
      updatedAt: now.toISOString(),
      ...(isLastStep ? { deliveredAt: now.toISOString() } : {}),
    };

    transaction.update(docRef, updated as any);
    return updated;
  });
}

/**
 * [§9.3] 7일 자동 구매확정 체크
 * 배송 완료 후 7일이 경과한 shipment의 orderId 목록을 반환
 */
export async function findAutoConfirmableOrderIds(): Promise<string[]> {
  const q = query(collection(db, SHIPMENTS_COL), where("status", "==", "DELIVERED"));
  const snap = await getDocs(q);
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const orderIds: string[] = [];
  snap.docs.forEach(d => {
    const data = d.data() as Shipment;
    if (data.deliveredAt && (now.getTime() - new Date(data.deliveredAt).getTime()) >= sevenDaysMs) {
      orderIds.push(data.orderId);
    }
  });
  return orderIds;
}

/**
 * [§15.2] Reveal Engine: 현재 시각 기준으로 노출 가능한 단계만 필터링
 * @returns { revealed: 확정 로그, pending: 예정 로그 }
 */
export function applyRevealFilter(path: PathStep[]): { revealed: PathStep[]; pending: PathStep[] } {
  const now = new Date();
  const revealed: PathStep[] = [];
  const pending: PathStep[] = [];

  for (const step of path) {
    if (new Date(step.estimatedTime) <= now) {
      revealed.push(step);
    } else {
      pending.push(step);
    }
  }

  return { revealed, pending };
}
