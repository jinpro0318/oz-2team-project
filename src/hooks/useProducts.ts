"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getProducts,
  getVisibleProducts,
  getProduct,
  getProductsByCelebrity,
} from "@/lib/services/product";

export function useProducts(visibleOnly = true) {
  return useQuery({
    queryKey: ["products", { visibleOnly }],
    queryFn: visibleOnly ? getVisibleProducts : getProducts,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["products", { visibleOnly: false }],
    queryFn: getProducts,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
}

export function useProductsByCelebrity(celebrityId: string) {
  return useQuery({
    queryKey: ["products", "celebrity", celebrityId],
    queryFn: () => getProductsByCelebrity(celebrityId),
    enabled: !!celebrityId,
  });
}
