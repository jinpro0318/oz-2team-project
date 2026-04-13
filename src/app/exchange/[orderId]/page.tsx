"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Radio, Input, App, Spin } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder, useCreateExchange } from "@/hooks/useOrders";
import type { ExchangeType } from "@/types";

const exchangeReasons = [
  "사이즈가 맞지 않아요",
  "색상이 다르게 보여요",
  "상품이 마음에 들지 않아요",
  "상품에 하자가 있어요",
  "기타",
];

const returnReasons = [
  "단순 변심",
  "상품 불량/하자",
  "배송 중 파손",
  "오배송",
  "기타",
];

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

type ViewState = "form" | "complete";

export default function ExchangePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: order, isLoading } = useOrder(orderId);
  const createExchangeMutation = useCreateExchange();

  const [type, setType] = useState<ExchangeType>("exchange");
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const [view, setView] = useState<ViewState>("form");
  const [ticketNumber, setTicketNumber] = useState("");

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="교환/반품 신청" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BackTopBar title="교환/반품 신청" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const reasons = type === "exchange" ? exchangeReasons : returnReasons;
  const refundAmount = order.totalAmount;

  const handleSubmit = async () => {
    if (!reason) {
      message.warning("사유를 선택해주세요");
      return;
    }

    try {
      const exchange = await createExchangeMutation.mutateAsync({
        orderId: order.id,
        orderItemIndex: 0,
        type,
        reason,
        reasonDetail: reason === "기타" ? reasonDetail : undefined,
        refundMethod: type === "return" ? refundMethod : undefined,
        refundAmount: type === "return" ? refundAmount : undefined,
      });
      setTicketNumber(exchange.ticketNumber);
      setView("complete");
    } catch {
      message.error("신청 처리 중 오류가 발생했습니다");
    }
  };

  if (view === "complete") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title={type === "exchange" ? "교환 신청 완료" : "반품 신청 완료"} />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircleFilled className="text-3xl text-success" />
          </div>
          <h1 className="mb-2 text-xl font-bold">
            {type === "exchange" ? "교환 신청이 완료되었습니다" : "반품 신청이 완료되었습니다"}
          </h1>
          <p className="text-sm text-text-secondary">접수번호: {ticketNumber}</p>

          <div className="mt-6 w-full rounded-lg border border-border bg-surface px-4 py-4">
            <div className="flex justify-between border-b border-border-light pb-2 text-sm">
              <span className="text-text-secondary">주문번호</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between border-b border-border-light py-2 text-sm">
              <span className="text-text-secondary">신청 유형</span>
              <span className="font-bold">{type === "exchange" ? "교환" : "반품"}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm">
              <span className="text-text-secondary">사유</span>
              <span>{reason}</span>
            </div>
          </div>

          {type === "return" && (
            <div className="mt-3 w-full rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
              <p className="text-xs font-bold text-warning">환불 안내</p>
              <p className="mt-1 text-xs text-text-secondary">
                예상 환불액: ₩{formatPrice(refundAmount)}
                <br />
                환불 수단: {refundMethod === "original" ? "원래 결제 수단" : "계좌 입금"}
                <br />
                수거 기사가 1~2 영업일 내 방문합니다.
              </p>
            </div>
          )}

          <Button
            type="primary"
            block
            size="large"
            className="mt-6 font-bold"
            onClick={() => router.push("/orders")}
          >
            주문 내역으로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="교환/반품 신청" />

      <div className="bg-surface px-3 py-3 border-b border-border">
        <p className="mb-2 text-xs text-text-secondary">신청 대상 상품</p>
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="h-14 w-12 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
            <div>
              <p className="text-xs font-bold">{item.product.name}</p>
              <p className="text-[11px] text-text-secondary">
                {item.color} / {item.size}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">신청 유형</h3>
        <div className="flex gap-2">
          {(["exchange", "return"] as ExchangeType[]).map((t) => (
            <button
              key={t}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-bold transition-colors ${
                type === t
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-text-secondary"
              }`}
              onClick={() => {
                setType(t);
                setReason("");
              }}
            >
              {t === "exchange" ? "교환" : "반품"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface px-3 py-4 border-b border-border">
        <h3 className="mb-3 text-[15px] font-bold">
          {type === "exchange" ? "교환" : "반품"} 사유
        </h3>
        <Radio.Group
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex flex-col gap-2"
        >
          {reasons.map((r) => (
            <Radio key={r} value={r} className="text-sm">
              {r}
            </Radio>
          ))}
        </Radio.Group>
        {reason === "기타" && (
          <Input.TextArea
            className="mt-2"
            placeholder="상세 사유를 입력해주세요"
            rows={3}
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
          />
        )}
      </div>

      {type === "return" && (
        <div className="bg-surface px-3 py-4 border-b border-border">
          <h3 className="mb-3 text-[15px] font-bold">환불 수단</h3>
          <Radio.Group
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
            className="flex flex-col gap-2"
          >
            <Radio value="original" className="text-sm">원래 결제 수단으로 환불</Radio>
            <Radio value="bank" className="text-sm">계좌 입금</Radio>
          </Radio.Group>
          <div className="mt-3 rounded-lg bg-bg px-3 py-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">예상 환불액</span>
              <span className="font-bold">₩{formatPrice(refundAmount)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 border-t border-border bg-surface px-3 py-3">
        <Button
          type="primary"
          block
          size="large"
          className="font-bold"
          loading={createExchangeMutation.isPending}
          onClick={handleSubmit}
        >
          {type === "exchange" ? "교환 신청하기" : "반품 신청하기"}
        </Button>
      </div>
    </div>
  );
}
