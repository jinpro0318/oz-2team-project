"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Button, Spin, Empty } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrders } from "@/hooks/useOrders";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "default" },
  cancelled: { label: "주문취소", color: "red" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
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
    if (activeFilter === "all") return true;
    if (activeFilter === "shipping") return order.status === "shipping" || order.status === "preparing";
    if (activeFilter === "delivered") return order.status === "delivered";
    if (activeFilter === "cancelled")
      return ["cancelled", "exchange_requested", "return_requested"].includes(order.status);
    return true;
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="주문 내역" />

      <div className="hide-scrollbar flex gap-2 overflow-x-auto border-b border-border bg-surface px-3 py-2.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              activeFilter === tab.key
                ? "border-text font-bold text-text"
                : "border-border text-text-secondary"
            }`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Empty description="주문 내역이 없습니다" />
        </div>
      ) : (
        <div className="flex-1 space-y-2 pt-2">
          {filteredOrders.map((order) => {
            const sc = statusConfig[order.status];
            return (
              <div key={order.id} className="bg-surface px-3 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs text-text-secondary">
                    {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  <Tag color={sc.color}>{sc.label}</Tag>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2">
                    <div className="h-16 w-14 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase text-text-muted">
                        {item.product.brand}
                      </p>
                      <p className="truncate text-[13px] font-bold">{item.product.name}</p>
                      <p className="text-[11px] text-text-secondary">
                        {item.color} / {item.size} · {item.quantity}개
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold">₩{formatPrice(item.price)}</p>
                  </div>
                ))}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="small"
                    block
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    주문 상세
                  </Button>
                  {order.status === "delivered" && (
                    <Button
                      size="small"
                      block
                      onClick={() => router.push(`/exchange/${order.id}`)}
                    >
                      교환/반품
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
