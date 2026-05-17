import { getDocuments, getDocument, where, updateDocument, createDocument, deleteDocument } from "@/lib/firestore";
import type { Product, ProductFormData } from "@/types";

// 기존: 전체 상품 조회 (어드민 K2 상품 관리 테이블에서 사용)
export async function getProducts(): Promise<Product[]> {
  return getDocuments<Product>("products");
}

// 기존: 노출 상품만 조회 (일반 사용자 피드·상품 목록에서 사용)
export async function getVisibleProducts(): Promise<Product[]> {
  return getDocuments<Product>("products", [where("isVisible", "==", true)]);
}

// 기존: 단일 상품 조회 (상품 상세 페이지에서 사용)
export async function getProduct(id: string): Promise<Product | null> {
  return getDocument<Product>("products", id);
}

// 기존: 셀럽별 상품 조회 (어드민 K4 셀럽 관리, K5 매출 분석에서 사용)
export async function getProductsByCelebrity(celebrityId: string): Promise<Product[]> {
  return getDocuments<Product>("products", [where("celebrityId", "==", celebrityId)]);
}

// 기존: 상품 정보 수정 (어드민 K2 수정 모달에서 사용)
export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  return updateDocument("products", id, data);
}

export async function createProduct(data: ProductFormData): Promise<string> {
  return createDocument("products", { ...data, salesCount: 0 }); // salesCount 0으로 초기화
}

export async function deleteProduct(id: string): Promise<void> {
  return deleteDocument("products", id);
}

export async function toggleProductVisibility(id: string, isVisible: boolean): Promise<void> {
  return updateDocument("products", id, { isVisible });
}
