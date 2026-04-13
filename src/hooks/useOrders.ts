"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrders,
  getAllOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  type CreateOrderInput,
} from "@/lib/services/order";
import {
  createExchange,
  getExchangesByOrder,
  type CreateExchangeInput,
} from "@/lib/services/exchange";
import { useAuthStore } from "@/stores/authStore";
import type { OrderStatus, OrderTimeline } from "@/types";

export function useOrders() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => getOrders(user!.id),
    enabled: !!user,
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: getAllOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; status: OrderStatus; timelineEntry?: OrderTimeline }) =>
      updateOrderStatus(params.id, params.status, params.timelineEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCreateExchange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExchangeInput) => createExchange(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
    },
  });
}

export function useExchangesByOrder(orderId: string) {
  return useQuery({
    queryKey: ["exchanges", orderId],
    queryFn: () => getExchangesByOrder(orderId),
    enabled: !!orderId,
  });
}
