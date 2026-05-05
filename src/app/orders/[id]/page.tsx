"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Steps, Tag, Spin, Alert } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import DeliveryTracking from "@/components/order/DeliveryTracking";
import { isFinishedStatus, getActiveClaimType, getCodeLogisticsTrackingNumber } from "@/lib/utils/order";
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
  const [trackingStatus, setTrackingStatus] = useState<string | null>(null);

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
  
  // 클레임 흐름 유지 판단
  const isReturnFlow = !!claimType && !isFinished;
  
  // 현재 접수 대기 상태 (수거 지시 전)
  const isPendingReturn = ["exchange_requested", "return_requested"].includes(order.status) &&
                          (!order.timeline?.some(t => t.status === "returning"));

  // 기본 상태 결정
  let currentStep = statusStepMap[order.status] ?? 0;

  // 실시간 상태 보정
  if (trackingStatus) {
    const isShipping = trackingStatus === "shipping" || ["배송중", "상품발송", "간선상차", "간선하차"].some(s => trackingStatus.includes(s));
    const isDelivered = trackingStatus === "delivered" || trackingStatus.includes("배송완료");
    const isReturning = trackingStatus === "returned" || trackingStatus.includes("반송") || trackingStatus.includes("수거");

    if (isReturnFlow) {
      if (order.status === "shipping" || order.status === "delivered" || order.status === "exchange_completed") {
        currentStep = 4; // 재배송/완료 단계
      } else if (isReturning) {
        currentStep = Math.max(currentStep, 2);
      } else if (trackingStatus === "delivered" && order.status === "returning") {
        currentStep = Math.max(currentStep, 3);
      }
    } else {
      if (isDelivered) currentStep = Math.max(currentStep, 3); 
      else if (isShipping) currentStep = Math.max(currentStep, 2);
    }
  } else if (isReturnFlow && (order.status === "shipping" || order.status === "delivered" || order.status === "exchange_completed")) {
    currentStep = 4;
  }

  // [보정] 클레임 반려 시 마지막 '반려' 단계 활성화
  if (order.status === "claim_rejected") {
    currentStep = 4;
  }

  // [추가] 반려 사유 추출
  const rejectionReason = order.timeline?.find(t => t.status === "claim_rejected")?.description;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg pb-[60px]">
      <BackTopBar title="주문 상세" backUrl="/orders" />

      <div className="flex items-center justify-between bg-surface px-3 py-3 border-b border-border">
        <div>
          <p className="text-xs text-text-secondary">주문번호</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{order.orderNumber}</p>
            {isReturnFlow && (
              <Tag color="volcano" className="m-0 text-[10px] py-0 px-1 border-none font-bold">
                교환/반품 진행중
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
                  <div className="text-black font-semibold">판매자가 클레임을 반려했습니다.</div>
                  <div className="text-gray-500 text-xs mt-1">
                    사유: {rejectionReason.replace("판매자가 클레임을 반려했습니다.", "").replace("사유:", "").trim()}
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
        <Steps
          current={currentStep}
          size="small"
          items={
            isReturnFlow
              ? [
                  { title: "접수완료" },
                  { title: "수거지시" },
                  { title: "반송중" },
                  { title: "반송완료" },
                  { title: "재배송" },
                ]
              : [
                  { title: "결제완료" },
                  { title: "준비중" },
                  { title: "배송중" },
                  { title: "배송완료" },
                  { title: order.status === "claim_rejected" ? "반려" : "구매확정" },
                ]
          }
        />
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">실시간 배송 조회</h3>
        {isPendingReturn ? (
          <div className="rounded-lg bg-orange-50 p-4 border border-orange-100 text-center">
            <p className="text-sm font-bold text-orange-600 mb-1">📦 교환/반품 접수가 완료되었습니다</p>
            <p className="text-xs text-orange-500">담당자가 확인 후 택배 기사님께 수거 지시를 내릴 예정입니다. 조금만 기다려 주세요!</p>
          </div>
        ) : (
          (() => {
            const displayTrackingNumber = getCodeLogisticsTrackingNumber(order.trackingNumber, order.status);
            return (
              <DeliveryTracking 
                carrierCode={order.carrierCode} 
                trackingNumber={displayTrackingNumber} 
                onStatusChange={setTrackingStatus}
              />
            );
          })()
        )}
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">주문 상품</h3>
        {order.items.map((item, idx) => {
          const lineTotal = (priceMap.get(item.productId) ?? item.product.price) * item.quantity;
          return (
            <div key={idx} className="flex items-center gap-3 py-2 border-b border-border-light last:border-b-0">
              <div className="h-16 w-14 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase text-text-muted">{item.product.brand}</p>
                <p className="truncate text-[13px] font-bold">{item.product.name}</p>
                <p className="text-[11px] text-text-secondary">{item.color} / {item.size} · {item.quantity}개</p>
              </div>
              <p className="shrink-0 text-sm font-bold">₩{formatPrice(lineTotal)}</p>
            </div>
          );
        })}
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
        {(() => {
          const liveTotal = order.items.reduce(
            (sum, item) => sum + (priceMap.get(item.productId) ?? item.product.price) * item.quantity,
            0
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
                <span>{order.shippingFee === 0 ? "무료" : `₩${formatPrice(order.shippingFee)}`}</span>
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
        {(order.status === "payment_complete" || order.status === "preparing") && (
          <Button block danger onClick={() => router.push(`/orders/${order.id}/cancel`)}>
            주문 취소 신청
          </Button>
        )}
        {(order.status === "delivered" || order.status === "exchange_completed" || order.status === "claim_rejected") && (
          <Button block type="primary" style={{ background: "#262626" }} onClick={() => router.push(`/orders/${order.id}/confirm`)}>
            구매 결정하기
          </Button>
        )}
        {(order.status === "delivered" || order.status === "exchange_completed") && (
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
