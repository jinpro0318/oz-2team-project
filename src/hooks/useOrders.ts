"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrders,
  getAllOrders,
  getAllOrdersForAnalytics, // [효진] 추가
  getOrder,
  createOrder,
  updateOrderStatus,
  subscribeOrder,
  subscribeOrders,
  subscribeAllOrders,
  type CreateOrderInput,
} from "@/lib/services/order";
import {
  createExchange,
  getExchangesByOrder,
  getAllExchanges,
  updateExchangeStatus, // [효진] 추가
  type CreateExchangeInput,
} from "@/lib/services/exchange";

import { useAuthStore } from "@/stores/authStore";
import type { OrderStatus, OrderTimeline } from "@/types";

export function useOrders() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // [v9.1] 실시간 구독 로직을 훅 내부에서 안정적으로 관리
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeOrders(user.id, (data) => {
      queryClient.setQueryData(["orders", user.id], data);
    });
    return () => unsub();
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => (user ? getOrders(user.id) : []),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분 캐시, 하지만 구독이 데이터를 실시간으로 주입함
  });
}

export function useAllOrders() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = subscribeAllOrders((data) => {
      queryClient.setQueryData(["orders", "all"], data);
    });
    return () => unsub();
  }, [queryClient]);

  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: () => getAllOrders(),
    staleTime: Infinity,
  });
}

export function useOrder(id: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeOrder(id, (data) => {
      queryClient.setQueryData(["orders", "detail", id], data);
    });
    return () => unsub();
  }, [id, queryClient]);

  return useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => (id ? getOrder(id) : null),
    enabled: !!id,
    staleTime: Infinity,
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
    mutationFn: (params: {
      id: string;
      status: OrderStatus;
      timelineEntry?: OrderTimeline;
      trackingNumber?: string;
      carrierCode?: string;
    }) =>
      updateOrderStatus(
        params.id,
        params.status,
        params.timelineEntry,
        params.trackingNumber,
        params.carrierCode,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useExecuteOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      action: any;
      trackingNumber?: string;
      carrierCode?: string;
      claimType?: string;
      reason?: string;
    }) => {
      const { CodeFulfillmentEngine } =
        await import("@/lib/services/CodeFulfillmentEngine");
      return CodeFulfillmentEngine.executeAction(params.id, params.action, {
        trackingNumber: params.trackingNumber,
        carrierCode: params.carrierCode,
        claimType: params.claimType,
        reason: params.reason,
      });
    },
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

// [효진] 어드민용 전체 교환/반품 조회 훅
export function useAllExchanges() {
  return useQuery({
    queryKey: ["exchanges", "all"],
    queryFn: getAllExchanges,
  });
}

// [효진] 통계용 주문 데이터 조회 훅
export function useAnalyticsOrders() {
  return useQuery({
    queryKey: ["orders", "analytics"],
    queryFn: getAllOrdersForAnalytics,
    staleTime: 5 * 60 * 1000, // 통계 데이터는 5분 정도 캐시 유지 가능
  });
}

// [효진] 교환/반품 상태 업데이트 훅

export function useUpdateExchangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      status: "requested" | "processing" | "completed";
    }) => updateExchangeStatus(params.id, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] }); // 연동된 주문 상태 변경 가능성 대응
    },
  });
}
