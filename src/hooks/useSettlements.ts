"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettlements,
  processSettlement,
  createSettlement,
} from "@/lib/services/settlement";
import type { Settlement } from "@/types";

// [효진] 전체 정산 내역 조회 (K7 정산 관리용)
export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: getSettlements,
    staleTime: 1000 * 60 * 2,
  });
}

// [효진] 정산 처리 mutation (K7 정산 처리 버튼용)
export function useProcessSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] }); // 목록 자동 갱신
    },
  });
}

// [효진] 새 정산 레코드 생성 mutation (K7 정산 관리용)
export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Settlement, "id" | "createdAt">) => createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
  });
}
