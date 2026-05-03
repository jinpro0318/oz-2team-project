"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Radio, Input, App, Spin } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleOutlined,
} from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useUIStore } from "@/stores/uiStore";

const cancelReasons = [
  "단순 변심",
  "주문 정보(주소, 연락처 등) 변경",
  "다른 상품 추가 후 재결제",
  "배송 지연",
  "상품 품절",
  "기타",
];

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OrderCancelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: order, isLoading } = useOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();

  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);

  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <BackTopBar title="주문 취소 신청" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <BackTopBar title="주문 취소 신청" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <InfoCircleOutlined className="mb-4 text-4xl text-text-muted" />
          <p className="text-text-secondary font-medium">
            주문을 찾을 수 없습니다
          </p>
          <Button
            className="mt-6 h-10 rounded-md px-8"
            onClick={() => router.back()}
          >
            뒤로 가기
          </Button>
        </div>
      </div>
    );
  }

  const canCancel =
    order.status === "payment_complete" || order.status === "preparing";

  if (!canCancel && !isComplete) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <BackTopBar title="주문 취소 불가" />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-error/5">
            <CloseCircleFilled className="text-5xl text-error/30" />
          </div>
          <h2 className="mb-3 text-xl font-bold tracking-tight text-[#111]">
            취소가 불가능한 상태입니다
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary text-center">
            상품이 이미 배송 준비를 마치고 출고되었거나
            <br />
            배송이 시작된 경우 시스템상 취소가 어렵습니다.
            <br />
            <span className="mt-2 block text-xs opacity-70">
              상품 수령 후 반품 신청을 이용해 주세요.
            </span>
          </p>
          <Button
            block
            size="large"
            className="mt-10 h-12 rounded-lg font-bold border-border text-text hover:border-text"
            onClick={() => router.back()}
          >
            확인
          </Button>
        </div>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!reason) {
      message.warning("취소 사유를 선택해주세요");
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: "cancelled",
        timelineEntry: {
          status: "cancelled",
          label: "주문 취소",
          date: new Date().toISOString(),
          description: `고객 요청으로 취소되었습니다: ${reason}${reason === "기타" ? ` (${reasonDetail})` : ""}`,
        },
      });
      setIsComplete(true);
    } catch {
      message.error("취소 처리 중 오류가 발생했습니다");
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-1 flex-col bg-surface">
        <BackTopBar title="취소 완료" />
        <div className="flex flex-1 flex-col items-center pt-16 px-6 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircleFilled className="text-3xl text-success" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#111]">
            주문이 취소되었습니다
          </h1>
          <p className="text-center text-sm text-text-secondary leading-relaxed mb-10">
            결제 금액은 영업일 기준 2~3일 내에
            <br />
            환불 처리가 완료될 예정입니다.
          </p>

          <div className="w-full overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="flex justify-between border-b border-border-light px-5 py-4">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                주문번호
              </span>
              <span className="text-sm font-bold text-[#111]">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center px-5 py-5 bg-[#F9F9F9]">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                환불 예정 금액
              </span>
              <span className="text-xl font-extrabold text-[#111]">
                ₩{formatPrice(order.totalAmount + order.shippingFee)}
              </span>
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            className="mt-12 h-14 rounded-xl font-bold bg-[#262626] border-none shadow-md"
            onClick={() => router.push("/orders")}
          >
            주문 내역으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <BackTopBar title="주문 취소 신청" />

      <div className="flex-1 overflow-y-auto pb-32 pt-2">
        <div className="mx-3 mb-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border-light px-4 py-3 bg-gray-50/30">
            <h3 className="text-[13px] font-extrabold text-[#111] uppercase tracking-tight">
              취소 상품 정보
            </h3>
          </div>
          <div className="px-4 py-1">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 py-4 border-b border-border-light last:border-none"
              >
                <div className="h-16 w-14 shrink-0 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-border-light" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-[#111] truncate mb-1">
                    {item.product.name}
                  </p>
                  <p className="text-[11px] font-medium text-text-secondary">
                    {item.color} / {item.size}{" "}
                    <span className="mx-1 opacity-30">|</span> {item.quantity}개
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-3 mb-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border-light px-4 py-3 bg-gray-50/30 text-left">
            <h3 className="text-[13px] font-extrabold text-[#111] uppercase tracking-tight">
              취소 사유
            </h3>
          </div>
          <div className="px-4 py-5 text-left">
            <Radio.Group
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex flex-col gap-4 w-full"
            >
              {cancelReasons.map((r) => (
                <Radio
                  key={r}
                  value={r}
                  className="text-[13px] font-medium m-0 flex items-center"
                >
                  {r}
                </Radio>
              ))}
            </Radio.Group>
            {reason === "기타" && (
              <Input.TextArea
                className="mt-5 rounded-lg border-border bg-[#F9F9F9] focus:bg-white text-sm p-3"
                placeholder="상세 사유를 입력해주세요"
                rows={3}
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="mx-3 mb-6 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border-light px-4 py-3 bg-gray-50/30 text-left">
            <h3 className="text-[13px] font-extrabold text-[#111] uppercase tracking-tight">
              환불 예정 정보
            </h3>
          </div>
          <div className="px-5 py-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-secondary">
                결제 수단
              </span>
              <span className="text-[13px] font-bold text-[#111]">
                {order.paymentMethod}
              </span>
            </div>
            <div className="pt-3 border-t border-border-light flex justify-between items-baseline">
              <span className="text-xs font-bold text-text-secondary">
                최종 환불 예정 금액
              </span>
              <span className="text-lg font-extrabold text-[#111] tracking-tight">
                ₩{formatPrice(order.totalAmount + order.shippingFee)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] border-t border-border bg-white/80 backdrop-blur-md px-4 py-4 pb-8 z-50">
        <Button
          type="primary"
          block
          size="large"
          className="font-bold h-13 rounded-xl bg-[#262626] border-none shadow-md"
          loading={updateStatusMutation.isPending}
          onClick={handleCancel}
        >
          취소 신청 완료하기
        </Button>
      </div>
    </div>
  );
}
