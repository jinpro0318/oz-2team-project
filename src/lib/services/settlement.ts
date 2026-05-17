import { getDocuments, createDocument, updateDocument, where } from "@/lib/firestore";
import type { Settlement, SettlementStatus } from "@/types";

export async function getSettlements(): Promise<Settlement[]> {
  const docs = await getDocuments<Settlement>("settlements");
  return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // 최신순 정렬
}

// 특정 셀럽의 정산 내역 조회
export async function getSettlementsByCelebrity(celebrityId: string): Promise<Settlement[]> {
  return getDocuments<Settlement>("settlements", [where("celebrityId", "==", celebrityId)]);
}

export async function createSettlement(data: Omit<Settlement, "id" | "createdAt">): Promise<string> {
  return createDocument("settlements", data);
}

export async function processSettlement(id: string): Promise<void> {
  return updateDocument("settlements", id, {
    status: "paid" as SettlementStatus,
    paidAt: new Date().toISOString(), // 처리 시각 기록
  });
}
