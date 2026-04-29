"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getVisibleProducts,
  getProduct,
  getProductsByCelebrity,
  createProduct,      // [효진] 추가
  updateProduct,      // [효진] 추가
  deleteProduct,      // [효진] 추가
  toggleProductVisibility, // [효진] 추가
} from "@/lib/services/product";
import type { ProductFormData } from "@/types"; // [효진] 추가

// 기존: 노출 상품만 조회 (일반 사용자 피드에서 사용)
export function useProducts(visibleOnly = true) {
  return useQuery({
    queryKey: ["products", { visibleOnly }],
    queryFn: visibleOnly ? getVisibleProducts : getProducts,
    staleTime: 1000 * 60 * 5,
  });
}

// 기존: 전체 상품 조회 (어드민 K2·K5 등에서 사용)
export function useAllProducts() {
  return useQuery({
    queryKey: ["products", { visibleOnly: false }],
    queryFn: getProducts,
    staleTime: 1000 * 60 * 5,
  });
}

// 기존: 단일 상품 조회 (상품 상세 페이지에서 사용)
export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
}

// 기존: 셀럽별 상품 조회
export function useProductsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["products", "celebrity", celebrityId],
    queryFn: () => getProductsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}

// [효진] 상품 등록 mutation (K2 상품 관리용)
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] }); // 목록 자동 갱신
    },
  });
}

// [효진] 상품 수정 mutation (K2 상품 관리용)
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// [효진] 상품 삭제 mutation (K2 상품 관리용)
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// [효진] 상품 노출 토글 mutation (K2 상품 관리 Switch용)
export function useToggleProductVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      toggleProductVisibility(id, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
