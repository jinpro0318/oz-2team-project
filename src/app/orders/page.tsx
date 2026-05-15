"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spin, Empty } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import BottomNav from "@/components/common/BottomNav";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { updateUserLastChecked } from "@/lib/services/user";
import { isFinishedStatus, getActiveClaimType } from "@/lib/utils/order";
import { buildProductPriceMap } from "@/lib/utils/price";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { label: string; icon: string; className: string }> = {
  payment_complete: { label: "결제완료", icon: "💳", className: "text-blue-500" },
  preparing: { label: "준비중", icon: "📦", className: "text-orange-500" },
  shipping: { label: "배송중", icon: "🚚", className: "text-blue-600" },
  delivered: { label: "배송완료", icon: "✓", className: "text-green-600" },
  cancelled: { label: "주문취소", icon: "✕", className: "text-red-500" },
  cancel_requested: { label: "취소요청", icon: "⌛", className: "text-orange-500" },
  exchange_requested: { label: "교환요청", icon: "🔄", className: "text-purple-500" },
  return_requested: { label: "반품요청", icon: "↩️", className: "text-purple-500" },
  returning: { label: "반송중", icon: "🚚", className: "text-orange-500" },
  returned: { label: "반송완료", icon: "📦", className: "text-green-500" },
  exchange_completed: { label: "교환완료", icon: "✅", className: "text-blue-500" },
  return_completed: { label: "반품완료", icon: "💸", className: "text-gray-600" },
  purchase_confirmed: { label: "구매확정", icon: "✨", className: "text-gray-900" },

  payment_pending: { label: "결제대기", icon: "⏳", className: "text-gray-400" },
  claim_rejected: { label: "클레임 반려", icon: "✕", className: "text-red-500" },
  inspecting: { label: "검수중", icon: "🔍", className: "text-blue-400" },
  inspection_completed: { label: "검수완료", icon: "✅", className: "text-blue-500" },
  exchange_preparing: { label: "상품준비", icon: "📦", className: "text-orange-500" },
  reshipping: { label: "교환배송", icon: "🚚", className: "text-blue-600" },
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
  const { user, setUser } = useAuthStore();
  const { data: orders = [], isLoading } = useOrders();

  // [디자인 요구사항] 진입 시점의 시간을 기억하여 'New' 표시 여부를 결정합니다.
  const [initialLastChecked] = useState(user?.lastCheckedOrders || "0");

  useEffect(() => {
    if (!user) return;

    const markAsRead = () => {
      const now = new Date().toISOString();
      updateUserLastChecked(user.id, "lastCheckedOrders").catch(console.error);
      // 로컬 스토어 업데이트 (마이페이지 등으로 돌아갔을 때 반영되도록)
      setUser({ ...user, lastCheckedOrders: now });
    };

    // 브라우저 종료/새로고침 대응
    window.addEventListener("beforeunload", markAsRead);

    return () => {
      // 페이지 이탈 시(뒤로가기 등) 업데이트 실행
      markAsRead();
      window.removeEventListener("beforeunload", markAsRead);
    };
  }, [user?.id]);

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") return true;

    if (activeFilter === "shipping") return order.status === "shipping" || order.status === "preparing";
    if (activeFilter === "delivered") return order.status === "delivered" || order.status === "purchase_confirmed";
    if (activeFilter === "cancelled") {
      return [
        "cancelled", 
        "exchange_requested", "return_requested", 
        "returning", "returned", 
        "exchange_completed", "return_completed"
      ].includes(order.status);

    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen pb-[60px]">
      <div className="flex-1 pb-4">
        <BackTopBar title="주문 내역" backUrl="/mypage" />

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
          <div className="space-y-2 py-2 bg-bg flex-1">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} initialLastChecked={initialLastChecked} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * [원복] 개별 주문 카드 컴포넌트
 * 복잡한 실시간 조회 로직을 제거하고 DB 상태에만 충실합니다.
 */
function OrderCard({ order, initialLastChecked }: { order: any; initialLastChecked: string }) {
  const router = useRouter();
  const status: OrderStatus = order.status;
  const sc = statusConfig[status] || statusConfig.payment_pending;
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  return (
    <div className="bg-surface border-y border-border-light overflow-hidden">
      {/* Order Card Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-text-secondary">
            {new Date(order.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).replace(/\. /g, ".")}
          </p>
          {order.createdAt > initialLastChecked && (
            <span className="inline-flex h-4 items-center justify-center rounded-full bg-[#ED4956] px-1.5 text-[9px] font-bold text-white leading-none">
              New
            </span>
          )}
        </div>
        {(() => {
          const isRejectedThenConfirmed = 
            status === 'purchase_confirmed' && 
            order.timeline?.some((t: any) => t.status === 'claim_rejected');
          
          if (isRejectedThenConfirmed) {
            const claimType = getActiveClaimType(order);
            const claimLabel = claimType === 'exchange' ? '교환' : '반품';
            return (
              <p className="text-[13px] font-bold text-red-500">
                {claimLabel} 반려 - 구매확정 ✕
              </p>
            );
          }

          return (
            <p className={`text-[13px] font-bold ${sc.className}`}>
              {sc.label} {sc.icon}
            </p>
          );
        })()}
      </div>

      {/* Product Rows */}
      {order.items.map((item: any, idx: number) => (
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
            <p className="text-[11px] font-semibold text-text-muted mb-0.5">
              {item.product.brand}
            </p>
            <p className="truncate text-[14px] font-bold text-text mb-0.5">{item.product.name}</p>
            <p className="text-[12px] text-text-secondary">
              {item.color} · {item.size} · {item.quantity}개
            </p>
            <p className="mt-1 text-[14px] font-bold">
              ₩{formatPrice(
                (priceMap.get(item.productId) ?? item.product.price) * item.quantity
              )}
            </p>
          </div>
        </div>
      ))}

      {/* 액션 버튼 */}
      <div className="flex gap-2 px-4 pb-4">
        {(status === "payment_complete" || status === "preparing") && (
          <Button
            size="large"
            className="flex-1 h-11 text-[13px] font-bold rounded-lg border-border text-text-secondary"
            onClick={() => router.push(`/orders/${order.id}/cancel`)}
          >
            주문 취소
          </Button>
        )}
        {status === "delivered" && (
          <Button
            size="large"
            className="flex-1 h-11 text-[13px] font-bold rounded-lg border-border text-text"
            onClick={() => router.push(`/exchange/${order.id}`)}
          >
            교환/반품
          </Button>
        )}
        {status === "delivered" ? (
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
              (status !== "payment_complete" && status !== "preparing")
                ? "bg-text !text-white border-none hover:!bg-black" 
                : "border-border text-text hover:!text-black hover:!border-black"
            }`}
            style={(status !== "payment_complete" && status !== "preparing") 
              ? { backgroundColor: "#262626", color: "white" } 
              : {}
            }
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            주문 상세 보기
          </Button>
        )}
      </div>
    </div>
  );
}
