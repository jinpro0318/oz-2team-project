"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCelebrities,
  getCelebrity,
  createCelebrity,
  updateCelebrity,
} from "@/lib/services/celebrity";
import {
  getPostsByCelebrity,
  updatePostHotspots,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/services/post";

import type { CelebrityFormData, Hotspot, Post } from "@/types";

// 기존: 전체 셀럽 목록 조회 (피드·어드민 K1·K4·K5·K7에서 사용)
export function useCelebrities() {
  return useQuery({
    queryKey: ["celebrities"],
    queryFn: getCelebrities,
    staleTime: 0,
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

export function useCreateCelebrity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CelebrityFormData) => createCelebrity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebrities"] }); // 목록 자동 갱신
    },
  });
}

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

export function usePostsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["posts", "celebrity", celebrityId],
    queryFn: () => getPostsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}

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

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Post, "id">) => createPost(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts", "celebrity", variables.celebrityId] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // 특정 셀럽의 포스트 목록도 명시적으로 무효화
      queryClient.invalidateQueries({ queryKey: ["posts", "celebrity"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: Partial<Omit<Post, "id">> }) =>
      updatePost(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

