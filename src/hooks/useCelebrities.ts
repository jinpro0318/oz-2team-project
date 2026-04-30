"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCelebrities,
  getCelebrity,
  createCelebrity,  // [효진] 추가
  updateCelebrity,  // [효진] 추가
} from "@/lib/services/celebrity";
import {
  getPostsByCelebrity,
  updatePostHotspots,
  createPost,
  deletePost, // [효진] 추가
} from "@/lib/services/post";
import type { CelebrityFormData, Hotspot, Post } from "@/types"; // [효진] 추가

// 기존: 전체 셀럽 목록 조회 (피드·어드민 K1·K4·K5·K7에서 사용)
export function useCelebrities() {
  return useQuery({
    queryKey: ["celebrities"],
    queryFn: getCelebrities,
    staleTime: 0, // [효진] 실시간 반영을 위해 캐시 유지 시간 제거
  });
}

// 기존: 단일 셀럽 조회
export function useCelebrity(id: string) {
  return useQuery({
    queryKey: ["celebrities", id],
    queryFn: () => getCelebrity(id),
    enabled: !!id,
  });
}

// [효진] 셀럽 생성 mutation (K4 셀럽 관리용)
export function useCreateCelebrity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CelebrityFormData) => createCelebrity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebrities"] }); // 목록 자동 갱신
    },
  });
}

// [효진] 셀럽 수정 mutation (K4 셀럽 관리용)
export function useUpdateCelebrity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CelebrityFormData> }) =>
      updateCelebrity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebrities"] });
    },
  });
}

// [효진] 셀럽의 포스트 목록 조회 (K4 핫스팟 드로어용)
export function usePostsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["posts", "celebrity", celebrityId],
    queryFn: () => getPostsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}

// [효진] 포스트 핫스팟 좌표 업데이트 mutation (K4 핫스팟 편집용)
export function useUpdatePostHotspots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, hotspots }: { postId: string; hotspots: Hotspot[] }) =>
      updatePostHotspots(postId, hotspots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// [효진] 포스트 생성 mutation (K4 셀럽 관리용)
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Post, "id">) => createPost(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "celebrity", variables.celebrityId] });
    },
  });
}

// [효진] 포스트 삭제 mutation (K4 셀럽 관리용)
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      // [효진] 삭제 즉시 'posts' 키를 포함한 모든 데이터를 최신화하여 화면에서 바로 사라지게 함
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // 특정 셀럽의 포스트 목록도 명시적으로 무효화
      queryClient.invalidateQueries({ queryKey: ["posts", "celebrity"] });
    },
  });
}
