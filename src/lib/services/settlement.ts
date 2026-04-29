import { getDocuments, createDocument, updateDocument, where } from "@/lib/firestore";
import type { Settlement, SettlementStatus } from "@/types";

// [효진] 전체 정산 내역 조회 (K7 정산 관리 테이블용)
export async function getSettlements(): Promise<Settlement[]> {
  const docs = await getDocuments<Settlement>("settlements");
  return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 최신순 정렬
}

// 특정 셀럽의 정산 내역 조회
export async function getSettlementsByCelebrity(celebrityId: string): Promise<Settlement[]> {
  return getDocuments<Settlement>("settlements", [where("celebrityId", "==", celebrityId)]);
}

// [효진] 새 정산 레코드 생성 (K7 정산 관리용)
export async function createSettlement(data: Omit<Settlement, "id" | "createdAt">): Promise<string> {
  return createDocument("settlements", data);
}

// [효진] 정산 처리 (상태를 "paid"로 변경, K7 정산 처리용)
export async function processSettlement(id: string): Promise<void> {
  return updateDocument("settlements", id, {
    status: "paid" as SettlementStatus,
    paidAt: new Date().toISOString(), // 처리 시각 기록
  });
}
