"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, App, Spin } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import BottomNav from "@/components/common/BottomNav";
import { useOrder, useCreateExchange, useUpdateOrderStatus } from "@/hooks/useOrders";
import type { ExchangeType } from "@/types";

const reasonsList = [
  "사이즈 불량 / 잘못 배송",
  "상품 불량 / 파손",
  "단순 변심",
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
  const updateStatusMutation = useUpdateOrderStatus();

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
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="교환/반품 신청" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const refundAmount = order.totalAmount;

  const handleSubmit = async () => {
    if (!reason) {
      message.warning("사유를 선택해주세요");
      return;
    }

    try {
      // 1. Create the exchange/return record
      const input: any = {
        orderId: order.id,
        orderItemIndex: 0,
        type,
        reason,
      };

      if (reason === "기타") {
        input.reasonDetail = reasonDetail;
      }

      if (type === "return") {
        input.refundMethod = refundMethod;
        input.refundAmount = refundAmount;
      }

      const exchange = await createExchangeMutation.mutateAsync(input);

      // 2. Update the order status and add a timeline entry
      const newStatus: any = type === "exchange" ? "exchange_requested" : "return_requested";
      const statusLabel = type === "exchange" ? "교환 요청" : "반품 요청";

      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: newStatus,
        timelineEntry: {
          status: newStatus,
          label: `${statusLabel} 접수됨`,
          timestamp: new Date().toISOString()
        }
      });

      setTicketNumber(exchange.ticketNumber);
      setView("complete");
    } catch (error) {
      console.error("Exchange submission failed:", error);
      message.error("신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  if (view === "complete") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title={type === "exchange" ? "교환 신청 완료" : "반품 신청 완료"} />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <CheckCircleFilled className="text-4xl text-success" />
          </div>
          <h1 className="mb-3 text-2xl font-bold">
            {type === "exchange" ? "신청이 완료되었습니다" : "반품 신청이 완료되었습니다"}
          </h1>
          <p className="mb-8 text-sm text-text-secondary">접수번호: <span className="font-bold text-text">{ticketNumber}</span></p>

          <div className="w-full rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">주문번호</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-border-light pt-4">
              <span className="text-text-secondary">신청 유형</span>
              <span className="font-bold px-2 py-1 bg-bg rounded text-xs">{type === "exchange" ? "교환 🔄" : "반품 📦"}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-border-light pt-4">
              <span className="text-text-secondary">신청 사유</span>
              <span className="font-medium">{reason}</span>
            </div>
          </div>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              type="primary"
              block
              size="large"
              className="h-12 font-bold bg-text border-none hover:!bg-black"
              style={{ backgroundColor: "#262626" }}
              onClick={() => router.push("/orders")}
            >
              주문 내역으로
            </Button>
            <Button
              block
              size="large"
              className="h-12 font-bold border-text text-text"
              onClick={() => router.push("/feed")}
            >
              쇼핑 계속하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-white">
      <BackTopBar title="교환/반품 신청" />

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Target Product */}
        <div className="bg-white px-4 py-4 border-b border-border">
          <p className="mb-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider">신청 상품</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="h-20 w-16 shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-border-light">
                {item.product.imageUrls?.[0] && (
                  <img src={item.product.imageUrls[0]} alt={item.product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight mb-0.5">
                  {item.product.brand}
                </p>
                <p className="text-[14px] font-bold text-text leading-tight mb-1">{item.product.name}</p>
                <p className="text-[12px] text-text-secondary">
                  {item.color} · {item.quantity}개 · ₩{formatPrice(item.price)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Request Type Selection */}
        <div className="bg-white px-4 py-4 border-b border-border">
          <h3 className="mb-4 text-[14px] font-bold">신청 유형</h3>
          <div className="flex gap-3">
            <button
              className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
                type === "exchange"
                  ? "border-text bg-white shadow-sm"
                  : "border-gray-100 bg-white"
              }`}
              onClick={() => {
                setType("exchange");
                setReason("");
              }}
            >
              <div className="text-2xl mb-2">🔄</div>
              <div className={`text-[13px] font-bold ${type === "exchange" ? "text-text" : "text-text-secondary"}`}>교환</div>
              <div className="text-[11px] text-text-muted mt-0.5">다른 옵션으로</div>
            </button>
            <button
              className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${
                type === "return"
                  ? "border-text bg-white shadow-sm"
                  : "border-gray-100 bg-white"
              }`}
              onClick={() => {
                setType("return");
                setReason("");
              }}
            >
              <div className="text-2xl mb-2">📦</div>
              <div className={`text-[13px] font-bold ${type === "return" ? "text-text" : "text-text-secondary"}`}>반품</div>
              <div className="text-[11px] text-text-muted mt-0.5">전액 환불</div>
            </button>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="bg-white px-4 py-4 border-b border-border">
          <h3 className="mb-4 text-[13px] font-bold">{type === "exchange" ? "교환" : "반품"} 사유</h3>
          <div className="flex flex-col gap-2">
            {reasonsList.map((r) => (
              <div
                key={r}
                className={`flex items-center gap-2.5 px-3 py-[11px] rounded-[8px] cursor-pointer transition-all border-[1.5px] ${
                  reason === r
                    ? "border-text bg-white"
                    : "border-border-light bg-white"
                }`}
                onClick={() => setReason(r)}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  reason === r ? "border-text" : "border-gray-300"
                }`}>
                  {reason === r && <div className="w-[7px] h-[7px] rounded-full bg-text" />}
                </div>
                <span className={`text-[13px] ${reason === r ? "font-bold text-text" : "text-text-secondary"}`}>
                  {r}
                </span>
              </div>
            ))}
          </div>
          {reason === "기타" && (
            <Input.TextArea
              className="mt-2.5 rounded-lg p-3 text-[13px]"
              placeholder="상세 사유를 입력해주세요"
              rows={3}
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
            />
          )}
        </div>

        {/* Refund Method (Only for Return) */}
        {type === "return" && (
          <div className="bg-white px-4 py-4 border-b border-border">
            <h3 className="mb-4 text-[13px] font-bold">환불 수단</h3>
            <div className="flex flex-col gap-2">
              {[
                { key: "original", label: "원래 결제 수단으로 환불" },
                { key: "bank", label: "계좌 입금" }
              ].map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center gap-2.5 px-3 py-[11px] rounded-[8px] cursor-pointer transition-all border-[1.5px] ${
                    refundMethod === m.key
                      ? "border-text bg-white"
                      : "border-border-light bg-white"
                  }`}
                  onClick={() => setRefundMethod(m.key)}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    refundMethod === m.key ? "border-text" : "border-gray-300"
                  }`}>
                    {refundMethod === m.key && <div className="w-[7px] h-[7px] rounded-full bg-text" />}
                  </div>
                  <span className={`text-[13px] ${refundMethod === m.key ? "font-bold text-text" : "text-text-secondary"}`}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-text-secondary font-medium">예상 환불액</span>
                <span className="text-[16px] font-bold text-text">₩{formatPrice(refundAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-gray-50 px-4 py-5">
          <p className="mb-2.5 text-[11px] font-bold text-text-secondary">📋 안내 사항</p>
          <div className="text-[11px] text-text-muted leading-relaxed space-y-1">
            <p>• 배송 완료 후 7일 이내 신청 가능합니다.</p>
            <p>• 단순 변심 반품 시 왕복 배송비 6,000원이 부과됩니다.</p>
            <p>• 상품 불량/파손의 경우 무료 수거 후 처리됩니다.</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border bg-white px-4 pt-3 pb-[62px]">
        <Button
          type="primary"
          block
          size="large"
          className="h-12 font-bold bg-text border-none hover:!bg-black"
          style={{ backgroundColor: "#262626" }}
          loading={createExchangeMutation.isPending}
          onClick={handleSubmit}
        >
          신청하기
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
