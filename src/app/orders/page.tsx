"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spin, Empty } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import BottomNav from "@/components/common/BottomNav";
import { useOrders } from "@/hooks/useOrders";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { label: string; icon: string; className: string }> = {
  payment_complete: { label: "결제완료", icon: "💳", className: "text-blue-500" },
  preparing: { label: "배송 준비 중", icon: "📦", className: "text-orange-500" },
  shipping: { label: "배송 중", icon: "🚚", className: "text-blue-600" },
  delivered: { label: "배송 완료", icon: "✓", className: "text-green-600" },
  cancelled: { label: "주문취소", icon: "✕", className: "text-red-500" },
  exchange_requested: { label: "교환요청", icon: "🔄", className: "text-purple-500" },
  return_requested: { label: "반품요청", icon: "↩️", className: "text-purple-500" },
  purchase_confirmed: { label: "구매확정", icon: "✨", className: "text-gray-900" },
  payment_pending: { label: "결제대기", icon: "⏳", className: "text-gray-400" },
};

const filterTabs = [
  { key: "all", label: "전체" },
  { key: "shipping", label: "배송 중" },
  { key: "delivered", label: "배송 완료" },
  { key: "cancelled", label: "취소/교환" },
];

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OrdersPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const { data: orders = [], isLoading } = useOrders();

  const filteredOrders = orders.filter((order) => {
    if (order.status === "payment_pending") return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "shipping") return order.status === "shipping" || order.status === "preparing";
    if (activeFilter === "delivered") return order.status === "delivered" || order.status === "purchase_confirmed";
    if (activeFilter === "cancelled")
      return ["cancelled", "exchange_requested", "return_requested"].includes(order.status);
    return true;
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg font-sans">
      <div className="flex-1 pb-[49px]">
        <BackTopBar title="주문 내역" />

        {/* Filter Tabs (Underline style) */}
        <div className="flex border-b border-border bg-surface">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 py-3 text-[13px] transition-all ${
                activeFilter === tab.key
                  ? "font-bold text-text border-b-2 border-text"
                  : "text-text-secondary border-b-2 border-transparent"
              }`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Spin size="large" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-24 px-4 text-center">
            <Empty description="주문 내역이 없습니다" />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {filteredOrders.map((order) => {
              const sc = statusConfig[order.status];
              return (
                <div key={order.id} className="bg-surface border-y border-border-light overflow-hidden">
                  {/* Order Card Header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <p className="text-[13px] font-medium text-text-secondary">
                      {new Date(order.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).replace(/\. /g, ".")}
                    </p>
                    <p className={`text-[13px] font-bold ${sc.className}`}>
                      {sc.label} {sc.icon}
                    </p>
                  </div>

                  {/* Product Rows */}
                  {order.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/product/${item.productId}`)}
                    >
                      <div className="h-20 w-16 shrink-0 rounded bg-gray-100 overflow-hidden border border-border-light">
                        {item.product.imageUrls?.[0] && (
                          <img src={item.product.imageUrls[0]} alt={item.product.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* [효진] 버그 수정 | 2026-04-29
                            원인: Product 타입에 'celebrity' 필드 없음 (존재하는 필드: 'brand', 'celebrityId')
                            수정: item.product.celebrity → item.product.brand */}
                        <p className="text-[11px] font-semibold text-text-muted mb-0.5">
                          {item.product.brand}
                        </p>
                        <p className="truncate text-[14px] font-bold text-text mb-0.5">{item.product.name}</p>
                        <p className="text-[12px] text-text-secondary">
                          {item.color} · {item.size} · {item.quantity}개
                        </p>
                        <p className="mt-1 text-[14px] font-bold">₩{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}

                  {/* Shipping Progress Info (Optional visual element from wireframe) */}
                  {order.status === "shipping" && (
                    <div className="mx-4 mb-3 rounded-lg bg-bg p-3 border border-border-light flex items-center gap-2">
                      <span className="text-base">🚚</span>
                      <p className="text-[12px] text-text-secondary leading-tight">
                        <strong className="text-text">배송이 시작되었습니다</strong> 도착 예정일은 곧 안내됩니다.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 px-4 pb-4">
                    {(order.status === "payment_complete" || order.status === "preparing") && (
                      <Button
                        size="large"
                        className="flex-1 h-11 text-[13px] font-bold rounded-lg border-border text-text-secondary"
                        onClick={() => router.push(`/orders/${order.id}/cancel`)}
                      >
                        주문 취소
                      </Button>
                    )}
                    {order.status === "delivered" && (
                      <Button
                        size="large"
                        className="flex-1 h-11 text-[13px] font-bold rounded-lg border-border text-text"
                        onClick={() => router.push(`/exchange/${order.id}`)}
                      >
                        교환/반품
                      </Button>
                    )}
                    {order.status === "delivered" ? (
                      <Button
                        type="primary"
                        size="large"
                        className="flex-1 h-11 text-[13px] font-bold rounded-lg bg-text border-none hover:!bg-black !text-white"
                        onClick={() => router.push(`/orders/${order.id}/confirm`)}
                        style={{ backgroundColor: "#262626", color: "white" }}
                      >
                        구매 확정
                      </Button>
                    ) : (
                      <Button
                        size="large"
                        className={`flex-1 h-11 text-[13px] font-bold rounded-lg ${
                          ["shipping", "cancelled", "exchange_requested", "return_requested", "purchase_confirmed"].includes(order.status)
                            ? "bg-text !text-white border-none hover:!bg-black" 
                            : "border-border text-text"
                        }`}
                        style={["shipping", "cancelled", "exchange_requested", "return_requested", "purchase_confirmed"].includes(order.status) 
                          ? { backgroundColor: "#262626", color: "white" } 
                          : {}
                        }
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        {["shipping", "cancelled", "exchange_requested", "return_requested", "purchase_confirmed"].includes(order.status) 
                          ? "주문 상세 보기" 
                          : "주문 상세"
                        }
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
