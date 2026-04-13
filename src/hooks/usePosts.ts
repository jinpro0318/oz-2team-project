"use client";

import { useQuery } from "@tanstack/react-query";
import { getPosts, getPostsByCelebrity } from "@/lib/services/post";

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: getPosts,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePostsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["posts", "celebrity", celebrityId],
    queryFn: () => getPostsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}
