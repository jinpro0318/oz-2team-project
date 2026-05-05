import type { Product } from "@/types";

export function formatKRW(amount: number): string {
  return `₩${Math.max(0, Math.round(amount)).toLocaleString("ko-KR")}`;
}

export function buildProductPriceMap(products: Product[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(p.id, p.price);
  }
  return map;
}

export function resolveUnitPrice(
  productId: string,
  fallback: number,
  priceMap?: Map<string, number>
): number {
  if (priceMap?.has(productId)) return priceMap.get(productId)!;
  return fallback;
}
