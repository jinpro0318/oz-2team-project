"use client";

import { useParams, useRouter } from "next/navigation";
import { Button, Steps, Tag, Spin } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder } from "@/hooks/useOrders";

const statusStepMap: Record<string, number> = {
  delivered: 3,
  purchase_confirmed: 4,
};

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="주문 상세" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BackTopBar title="주문 상세" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const currentStep = statusStepMap[order.status] ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="주문 상세" />

      <div className="flex items-center justify-between bg-surface px-3 py-3 border-b border-border">
        <div>
          <p className="text-xs text-text-secondary">주문번호</p>
          <p className="text-sm font-bold">{order.orderNumber}</p>
        </div>
        <Tag>{new Date(order.createdAt).toLocaleDateString("ko-KR")}</Tag>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">배송 현황</h3>
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: "결제완료" },
            { title: "준비중" },
            { title: "배송중" },
            { title: "배송완료" },
            { title: "구매확정" },
          ]}
        />
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">배송 추적</h3>
        <div className="space-y-3">
          {(order.timeline ?? []).map((t, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`} />
                {i < (order.timeline?.length ?? 0) - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className="pb-3">
                <p className="text-xs font-bold">{t.label}</p>
                <p className="text-[11px] text-text-secondary">{t.date}</p>
                {t.description && (
                  <p className="mt-0.5 text-[11px] text-text-muted">{t.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">주문 상품</h3>
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 py-2 border-b border-border-light last:border-b-0">
            <div className="h-16 w-14 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase text-text-muted">{item.product.brand}</p>
              <p className="truncate text-[13px] font-bold">{item.product.name}</p>
              <p className="text-[11px] text-text-secondary">{item.color} / {item.size} · {item.quantity}개</p>
            </div>
            <p className="shrink-0 text-sm font-bold">₩{formatPrice(item.price)}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-2 text-[15px] font-bold">배송지 정보</h3>
        <p className="text-sm font-semibold">{order.shippingAddress.recipient}</p>
        <p className="text-xs text-text-secondary">{order.shippingAddress.phone}</p>
        <p className="mt-1 text-xs text-text-secondary">
          ({order.shippingAddress.zipCode}) {order.shippingAddress.address} {order.shippingAddress.addressDetail}
        </p>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-2 text-[15px] font-bold">결제 정보</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">결제 수단</span>
            <span>{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">상품 금액</span>
            <span>₩{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">배송비</span>
            <span>{order.shippingFee === 0 ? "무료" : `₩${formatPrice(order.shippingFee)}`}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-bold">
            <span>총 결제 금액</span>
            <span>₩{formatPrice(order.totalAmount + order.shippingFee)}</span>
          </div>
        </div>
      </div>

      <div className="bg-surface px-3 py-4 space-y-2">
        {(order.status === "payment_complete" || order.status === "preparing") && (
          <Button block danger onClick={() => router.push(`/orders/${order.id}/cancel`)}>
            주문 취소 신청
          </Button>
        )}
        {order.status === "delivered" && (
          <Button block type="primary" style={{ background: "#262626" }} onClick={() => router.push(`/orders/${order.id}/confirm`)}>
            구매 결정하기
          </Button>
        )}
        {order.status === "delivered" && (
          <Button block onClick={() => router.push(`/exchange/${order.id}`)}>
            교환/반품 신청
          </Button>
        )}
        <Button
          block
          type="text"
          icon={<PhoneOutlined />}
          onClick={() => window.open("tel:1588-1234")}
        >
          고객센터 1588-1234
        </Button>
      </div>
    </div>
  );
}
