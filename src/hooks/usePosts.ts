"use client";

import { useQuery } from "@tanstack/react-query";
import { getPosts, getPostsByCelebrity } from "@/lib/services/post";

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: getPosts,
    staleTime: 0, // [효진] 실시간 반영을 위해 캐시 유지 시간 제거
  });
}

export function usePostsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["posts", "celebrity", celebrityId],
    queryFn: () => getPostsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}
