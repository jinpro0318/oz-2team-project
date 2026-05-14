"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Steps, Tag, Spin, Alert, App } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import DeliveryTracking from "@/components/order/DeliveryTracking";
import { isFinishedStatus, getActiveClaimType } from "@/lib/utils/order";
import { buildProductPriceMap } from "@/lib/utils/price";

import { LogisticsStatusResolver } from "@/lib/services/LogisticsStatusResolver";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();
  const { message } = App.useApp();
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  const [showCancelModal, setShowCancelModal] = useState(false);

  // [v9.1] 배송 엔진으로부터 받은 실시간 단계 정보
  const [stepperData, setStepperData] = useState<{
    current: number;
    steps: any[];
    type?: string;
  } | null>(null);

  // [v9.1] 콜백 안정화: 무한 루프 방지 핵심 로직
  const handleStatusChange = useCallback(
    (status: string, extra?: { current: number; steps: any[]; type?: string }) => {
      if (extra) {
        setStepperData((prev) => {
          // 불필요한 상태 업데이트 방지 (값 비교)
          if (
            prev?.current === extra.current &&
            prev?.steps.length === extra.steps.length &&
            prev?.type === extra.type
          ) {
            return prev;
          }
          return { current: extra.current, steps: extra.steps, type: extra.type };
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

  // [v14.0] 4+4 Phase Finalization: 교환 시 7단계 레거시(E)를 제거하고 현재 페이즈(EQ/ES)를 자동 판별합니다.
  const isReshipping = [
    "exchange_preparing",
    "reshipping",
    "exchange_completed",
  ].includes(order.status);
  const shipmentType =
    claimType === "return"
      ? "R"
      : claimType === "exchange"
        ? isReshipping
          ? "ES"
          : "EQ"
        : "S";

  // 1. [v12.5 복원] 하단 물류 엔진의 실시간 계산 결과(stepperData)를 1순위로 반영하여 "순간이동" 등 지능형 복구를 수용합니다.
  const activeShipmentType = stepperData?.type || shipmentType;
  let currentStep =
    stepperData?.current ??
    LogisticsStatusResolver.getTargetIndex(order.status, activeShipmentType);

  // 2. UI용 스텝 리스트 (물류 엔진 컴포넌트가 보내준 동적 스텝 우선 반영)
  const displaySteps =
    stepperData?.steps && stepperData.steps.length > 0
      ? stepperData.steps
      : LogisticsStatusResolver.getUISteps(activeShipmentType);

  // (단, claim_rejected, cancelled, cancel_requested 같은 특수 상태는 원본 order.status를 보존합니다)
  const engineStatus =
    ["claim_rejected", "cancelled", "cancel_requested"].includes(order.status)
      ? order.status
      : LogisticsStatusResolver.getStatusFromIndex(
          currentStep,
          activeShipmentType,
        ) || order.status;

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    try {
      const targetStatus = engineStatus === "payment_complete" ? "cancelled" : "cancel_requested";
      const targetLabel = engineStatus === "payment_complete" ? "주문 취소" : "주문 취소 요청";
      const desc = engineStatus === "payment_complete" 
        ? "단순 변심으로 인한 주문 취소 (결제완료 전 단계 즉시 취소)" 
        : "상품 준비 중 단계에서의 취소 요청 (판매자 승인 대기)";

      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: targetStatus,
        timelineEntry: {
          status: targetStatus,
          label: targetLabel,
          date: new Date().toISOString(),
          description: desc,
        },
      });
      message.success(targetStatus === "cancelled" ? "주문이 정상적으로 취소되었습니다." : "취소 요청이 접수되었습니다.");
    } catch (e) {
      console.error(e);
      message.error("처리 중 오류가 발생했습니다.");
    }
  };

  const handleRevertCancelRequest = async () => {
    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: "preparing",
        timelineEntry: {
          status: "preparing",
          label: "취소 요청 철회",
          date: new Date().toISOString(),
          description: "구매자가 주문 취소 요청을 철회했습니다.",
        },
      });
      message.success("주문 취소 요청이 철회되었습니다.");
    } catch (e) {
      console.error(e);
      message.error("처리 중 오류가 발생했습니다.");
    }
  };

  // [추가] 반려 사유 추출
  const rejectionReason = order.timeline?.find(
    (t) => t.status === "claim_rejected",
  )?.description;

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col bg-bg pb-[60px]">
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
        <Steps 
          current={currentStep} 
          size="small" 
          items={displaySteps} 
          responsive={false}
          titlePlacement="vertical"
          className="custom-horizontal-steps"
        />
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">실시간 배송 조회</h3>
        <DeliveryTracking
          key={order.trackingNumber}
          orderId={order.orderNumber}
          documentId={order.id}
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
        {/* [v13.13] 주문 취소: 최종 종료되지 않았고, 클레임이 없으며, 결제완료/준비중일 때만 가능 */}
        {!isFinished &&
          !claimType &&
          (engineStatus === "payment_complete" ||
            engineStatus === "preparing") && (
            <Button
              block
              danger
              onClick={() => setShowCancelModal(true)}
            >
              주문 취소 신청
            </Button>
          )}

        {/* [NEW] 취소 요청 중일 때, 구매자가 직접 취소 요청을 철회할 수 있는 기능 */}
        {engineStatus === "cancel_requested" && (
          <Button
            block
            onClick={handleRevertCancelRequest}
          >
            취소 신청 철회
          </Button>
        )}

        {/* [v13.21] 구매 결정: 물건을 받은 상태(배송완료/교환완료/반려)에서만 노출 */}
        {!isFinished &&
          (order.status === "delivered" ||
            order.status === "exchange_completed" ||
            engineStatus === "exchange_completed" ||
            order.status === "claim_rejected") && (
          <Button
            block
            type="primary"
            style={{ background: "#262626", height: "48px", fontWeight: "bold" }}
            onClick={() => router.push(`/orders/${order.id}/confirm`)}
          >
            구매 결정하기
          </Button>
        )}

        {/* [v13.21] 교환/반품 신청: 물건을 받은 상태에서만 노출하며, 이미 진행중인 클레임이 없을 때만 가능 (혹은 교환완료된 후 재신청) */}
        {!isFinished &&
          (order.status === "delivered" ||
            order.status === "exchange_completed" ||
            engineStatus === "exchange_completed" ||
            order.status === "claim_rejected") && (
          <Button 
            block 
            style={{ height: "48px", fontWeight: "bold" }}
            onClick={() => router.push(`/exchange/${order.id}`)}
          >
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

      {/* 커스텀 중앙 정렬 취소 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
          <div className="w-[320px] rounded-[20px] bg-white p-6 text-center shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-lg font-bold text-[#111]">주문 취소</h3>
            <p className="mb-6 text-[15px] font-medium text-text-secondary leading-snug">
              정말 주문 취소를<br />진행하시겠습니까?
            </p>
            <div className="flex gap-2.5">
              <button
                className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border border-border bg-white text-[15px] font-bold text-[#111] transition-all hover:bg-gray-50 active:scale-95"
                onClick={() => setShowCancelModal(false)}
              >
                아니오
              </button>
              <button
                className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl border-none bg-[#F1416C] text-[15px] font-bold text-white shadow-md shadow-red-100 transition-all active:scale-95"
                onClick={handleConfirmCancel}
              >
                예
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
