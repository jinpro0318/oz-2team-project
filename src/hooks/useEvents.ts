"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActiveEvents,
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/services/events";
import type { EventFormData } from "@/types";

// 메인/배너용: 진행 중인 이벤트만
export function useEvents() {
  return useQuery({
    queryKey: ["events", "active"],
    queryFn: getActiveEvents,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllEvents() {
  return useQuery({
    queryKey: ["events", "all"],
    queryFn: getAllEvents,
    staleTime: 1000 * 60 * 5,
  });
}

// 단일 이벤트 조회 — 상세 페이지 등
export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EventFormData) => createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventFormData> }) =>
      updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
