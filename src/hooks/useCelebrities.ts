"use client";

import { useQuery } from "@tanstack/react-query";
import { getCelebrities, getCelebrity } from "@/lib/services/celebrity";

export function useCelebrities() {
  return useQuery({
    queryKey: ["celebrities"],
    queryFn: getCelebrities,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCelebrity(id: string) {
  return useQuery({
    queryKey: ["celebrities", id],
    queryFn: () => getCelebrity(id),
    enabled: !!id,
  });
}
