"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Steps, Tag, Spin, Alert } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import DeliveryTracking from "@/components/order/DeliveryTracking";
import { isFinishedStatus, getActiveClaimType } from "@/lib/utils/order";
import { buildProductPriceMap } from "@/lib/utils/price";

const statusStepMap: Record<string, number> = {
  // 정상 흐름
  payment_complete: 0,
  preparing: 1,
  shipping: 2,
  delivered: 3,
  purchase_confirmed: 4,
  // 교환/반품 흐름
  exchange_requested: 0,
  return_requested: 0,
  returning: 2,
  returned: 3,
};

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  // [v9.1] 배송 엔진으로부터 받은 실시간 단계 정보
  const [stepperData, setStepperData] = useState<{
    current: number;
    steps: any[];
  } | null>(null);

  // [v9.1] 콜백 안정화: 무한 루프 방지 핵심 로직
  const handleStatusChange = useCallback(
    (status: string, extra?: { current: number; steps: any[] }) => {
      if (extra) {
        setStepperData((prev) => {
          // 불필요한 상태 업데이트 방지 (값 비교)
          if (
            prev?.current === extra.current &&
            prev?.steps.length === extra.steps.length
          ) {
            return prev;
          }
          return { current: extra.current, steps: extra.steps };
        });
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <BackTopBar title="주문 상세" backUrl="/orders" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BackTopBar title="주문 상세" backUrl="/orders" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  // 클레임 이력 및 종료 여부 판단 (유틸리티 활용)
  const claimType = getActiveClaimType(order);
  const isFinished = isFinishedStatus(order.status);

  // 현재 접수 대기 상태 (수거 지시 전)
  const isPendingReturn =
    ["exchange_requested", "return_requested"].includes(order.status) &&
    !order.timeline?.some((t) => t.status === "returning");

  // [v9.1] 단일 진실의 샘 원칙: 주문서(order.status)를 마스터로, 배송기(stepperData)를 디테일로 사용
  const fallbackMap: Record<string, number> = {
    payment_complete: 0,
    preparing: 1,
    shipping: 2,
    delivered: 3,
    purchase_confirmed: 4,
    exchange_requested: 0,
    return_requested: 0,
  };

  // [v9.1] 클레임(교환/반품) 전용 단계 정의
  const claimStepMap: Record<string, number> = {
    exchange_requested: 0,
    return_requested: 0,
    returning: 1,
    returned: 2,
    inspecting: 3,
    "re-shipping": 4,
    exchange_completed: 5,
    return_completed: 3,
  };

  const claimSteps = claimType === "return" 
    ? [{ title: "반품접수" }, { title: "수거중" }, { title: "수거완료" }, { title: "반품완료" }]
    : [{ title: "교환접수" }, { title: "수거중" }, { title: "수거완료" }, { title: "검수중" }, { title: "교환배송" }, { title: "교환완료" }];

  // 1. 기본 단계 결정 (클레임 여부에 따라 분기)
  let currentStep = 0;
  let displaySteps = [];

  if (claimType) {
    currentStep = claimStepMap[order.status] ?? 0;
    displaySteps = claimSteps;
    
    if (stepperData) {
      currentStep = Math.max(currentStep, stepperData.current);
    }
  } else {
    currentStep = fallbackMap[order.status] ?? 0;
    displaySteps = [
      { title: "결제완료" },
      { title: "준비중" },
      { title: "배송중" },
      { title: "배송완료" },
      { title: "구매확정" },
    ];

    if (stepperData) {
      if (order.status === "shipping" && stepperData.current < 2) currentStep = 2;
      else if (order.status === "delivered" && stepperData.current < 3) currentStep = 3;
      else if (order.status === "purchase_confirmed") currentStep = 4;
    }
  }

  // [추가] 반려 사유 추출
  const rejectionReason = order.timeline?.find(
    (t) => t.status === "claim_rejected",
  )?.description;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg pb-[60px]">
      <BackTopBar title="주문 상세" backUrl="/orders" />

      <div className="flex items-center justify-between bg-surface px-3 py-3 border-b border-border">
        <div>
          <p className="text-xs text-text-secondary">주문번호</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{order.orderNumber}</p>
            {claimType && !isFinished && (
              <Tag
                color="volcano"
                className="m-0 text-[10px] py-0 px-1 border-none font-bold"
              >
                {claimType === "exchange" ? "교환 진행중" : "반품 진행중"}
              </Tag>
            )}
          </div>
        </div>
        <Tag className="bg-gray-100 border-none text-text-secondary">
          {new Date(order.createdAt).toLocaleDateString("ko-KR")}
        </Tag>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        {order.status === "claim_rejected" && rejectionReason && (
          <div className="mb-4">
            <Alert
              title="클레임 반려 안내"
              description={
                <div className="whitespace-pre-wrap">
                  <div className="text-black font-semibold">
                    판매자가 클레임을 반려했습니다.
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    사유:{" "}
                    {rejectionReason
                      .replace("판매자가 클레임을 반려했습니다.", "")
                      .replace("사유:", "")
                      .trim()}
                  </div>
                </div>
              }
              type="error"
              showIcon
              className="rounded-lg"
            />
          </div>
        )}
        <h3 className="mb-3 text-[15px] font-bold">배송 현황</h3>
        <Steps current={currentStep} size="small" items={displaySteps} />
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">실시간 배송 조회</h3>
        <DeliveryTracking
          key={order.trackingNumber}
          orderId={order.id}
          carrierCode={order.carrierCode}
          trackingNumber={order.trackingNumber}
          onStatusChange={handleStatusChange}
          orderStatus={order.status}
        />
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">주문 상품</h3>
        {order.items.map((item, idx) => {
          const lineTotal =
            (priceMap.get(item.productId) ?? item.product.price) *
            item.quantity;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 py-2 border-b border-border-light last:border-b-0"
            >
              <div className="h-16 w-14 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase text-text-muted">
                  {item.product.brand}
                </p>
                <p className="truncate text-[13px] font-bold">
                  {item.product.name}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {item.color} / {item.size} · {item.quantity}개
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold">
                ₩{formatPrice(lineTotal)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-2 text-[15px] font-bold">배송지 정보</h3>
        <p className="text-sm font-semibold">
          {order.shippingAddress.recipient}
        </p>
        <p className="text-xs text-text-secondary">
          {order.shippingAddress.phone}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          ({order.shippingAddress.zipCode}) {order.shippingAddress.address}{" "}
          {order.shippingAddress.addressDetail}
        </p>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-2 text-[15px] font-bold">결제 정보</h3>
        {(() => {
          const liveTotal = order.items.reduce(
            (sum, item) =>
              sum +
              (priceMap.get(item.productId) ?? item.product.price) *
                item.quantity,
            0,
          );
          return (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">결제 수단</span>
                <span>{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">상품 금액</span>
                <span>₩{formatPrice(liveTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">배송비</span>
                <span>
                  {order.shippingFee === 0
                    ? "무료"
                    : `₩${formatPrice(order.shippingFee)}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                <span>총 결제 금액</span>
                <span>₩{formatPrice(liveTotal + order.shippingFee)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="bg-surface px-3 py-4 space-y-2">
        {(order.status === "payment_complete" ||
          order.status === "preparing") && (
          <Button
            block
            danger
            onClick={() => router.push(`/orders/${order.id}/cancel`)}
          >
            주문 취소 신청
          </Button>
        )}
        {(order.status === "delivered" ||
          order.status === "exchange_completed" ||
          order.status === "claim_rejected") && (
          <Button
            block
            type="primary"
            style={{ background: "#262626" }}
            onClick={() => router.push(`/orders/${order.id}/confirm`)}
          >
            구매 결정하기
          </Button>
        )}
        {(order.status === "delivered" ||
          order.status === "exchange_completed") && (
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
