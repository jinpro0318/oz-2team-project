import { getDocuments, getDocument, createDocument, updateDocument } from "@/lib/firestore";
import type { Celebrity, CelebrityFormData } from "@/types";

// 기존: 전체 셀럽 목록 조회 (피드, 어드민 K1·K4·K5·K7에서 사용)
export async function getCelebrities(): Promise<Celebrity[]> {
  return getDocuments<Celebrity>("celebrities");
}

// 기존: 단일 셀럽 조회
export async function getCelebrity(id: string): Promise<Celebrity | null> {
  return getDocument<Celebrity>("celebrities", id);
}

// [효진] 셀럽 생성 (K4 셀럽 관리 등록 모달용)
export async function createCelebrity(data: CelebrityFormData): Promise<string> {
  return createDocument("celebrities", data);
}

// [효진] 셀럽 정보 수정 (K4 셀럽 관리 수정 모달용)
export async function updateCelebrity(id: string, data: Partial<CelebrityFormData>): Promise<void> {
  return updateDocument("celebrities", id, data);
}
