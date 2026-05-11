"use client";

import { useQuery } from "@tanstack/react-query";
import { getActiveEvents, getEvent } from "@/lib/services/events";

export function useEvents() {
  return useQuery({
    queryKey: ["events", "active"],
    queryFn: getActiveEvents,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  });
}
