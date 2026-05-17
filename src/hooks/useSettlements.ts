"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettlements,
  processSettlement,
  createSettlement,
} from "@/lib/services/settlement";
import type { Settlement } from "@/types";

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: getSettlements,
    staleTime: 1000 * 60 * 2,
  });
}

export function useProcessSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] }); // 목록 자동 갱신
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Settlement, "id" | "createdAt">) => createSettlement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
  });
}
