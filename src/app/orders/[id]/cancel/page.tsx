"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Radio, Input, App, Spin } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder, useUpdateOrderStatus } from "@/hooks/useOrders";

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

  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="주문 취소 신청" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BackTopBar title="주문 취소 신청" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const canCancel = order.status === "payment_complete" || order.status === "preparing";

  if (!canCancel && !isComplete) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="주문 취소 불가" />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <CloseCircleFilled className="mb-4 text-5xl text-error/20" />
          <h2 className="mb-2 text-lg font-bold">취소할 수 없는 단계입니다</h2>
          <p className="text-center text-sm text-text-secondary">
            배송 준비가 완료되었거나 이미 배송이 시작된 상품은 취소가 불가합니다. 배송 완료 후 반품 신청을 이용해주세요.
          </p>
          <Button block className="mt-6" onClick={() => router.back()}>뒤로 가기</Button>
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
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="취소 완료" />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircleFilled className="text-3xl text-success" />
          </div>
          <h1 className="mb-2 text-xl font-bold">주문이 취소되었습니다</h1>
          <p className="text-sm text-text-secondary">결제 금액은 영업일 기준 2~3일 내에 환불됩니다.</p>

          <div className="mt-8 w-full rounded-lg border border-border bg-surface px-4 py-4">
            <div className="flex justify-between border-b border-border-light pb-2 text-sm">
              <span className="text-text-secondary">주문번호</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm">
              <span className="text-text-secondary">환불 예정 금액</span>
              <span className="font-bold">₩{formatPrice(order.totalAmount + order.shippingFee)}</span>
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            className="mt-8 font-bold"
            onClick={() => router.push("/orders")}
            style={{ background: "#262626", border: "none" }}
          >
            주문 내역으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="주문 취소 신청" />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="bg-surface px-3 py-4 border-b border-border">
          <h3 className="mb-3 text-[15px] font-bold">취소 상품 정보</h3>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 last:pb-0">
              <div className="h-14 w-12 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
              <div>
                <p className="text-xs font-bold">{item.product.name}</p>
                <p className="text-[11px] text-text-secondary">
                  {item.color} / {item.size} · {item.quantity}개
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface px-3 py-4 border-b border-border mt-2">
          <h3 className="mb-3 text-[15px] font-bold">취소 사유</h3>
          <Radio.Group
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex flex-col gap-3"
          >
            {cancelReasons.map((r) => (
              <Radio key={r} value={r} className="text-sm">
                {r}
              </Radio>
            ))}
          </Radio.Group>
          {reason === "기타" && (
            <Input.TextArea
              className="mt-3"
              placeholder="상세 사유를 입력해주세요"
              rows={3}
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
            />
          )}
        </div>

        <div className="bg-surface px-3 py-4 mt-2">
          <h3 className="mb-2 text-[15px] font-bold">환불 예정 정보</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">결제 수단</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between border-t border-border-light pt-1.5 font-bold">
              <span>환불 예정 금액</span>
              <span>₩{formatPrice(order.totalAmount + order.shippingFee)}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-text-muted leading-relaxed">
            · 취소 완료 후 결제 수단에 따라 실제 환불까지 영업일 기준 3~5일 정도 소요될 수 있습니다.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] border-t border-border bg-surface px-3 py-3">
        <Button
          type="primary"
          block
          size="large"
          className="font-bold h-12"
          danger
          loading={updateStatusMutation.isPending}
          onClick={handleCancel}
        >
          취소 신청하기
        </Button>
      </div>
    </div>
  );
}
