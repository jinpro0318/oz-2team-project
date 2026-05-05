"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, App, Spin } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { useOrder, useCreateExchange, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { buildProductPriceMap } from "@/lib/utils/price";
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
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);
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
      <>
        <BackTopBar title="교환/반품 신청" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <BackTopBar title="교환/반품 신청" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </>
    );
  }

  const refundAmount = order.totalAmount;

  const handleSubmit = async () => {
    if (!reason) {
      message.warning("사유를 선택해주세요");
      return;
    }

    try {
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

      const newStatus: any = type === "exchange" ? "exchange_requested" : "return_requested";
      const statusLabel = type === "exchange" ? "교환 요청" : "반품 요청";

      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: newStatus,
        timelineEntry: {
          status: newStatus,
          label: `${statusLabel} 접수됨`,
          date: new Date().toISOString()
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
    const isExchange = type === "exchange";

    return (
      <>
        <BackTopBar title="신청 완료" />
        
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center gap-3">
          <div 
            className={`w-[68px] h-[68px] rounded-full flex items-center justify-center mb-1`}
            style={{ backgroundColor: isExchange ? "#E8FDF5" : "#FFF1F2" }}
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-[32px] h-[32px] fill-none" 
              style={{ 
                stroke: isExchange ? "#1BC5BD" : "#ED4956", 
                strokeWidth: "2.5", 
                strokeLinecap: "round", 
                strokeLinejoin: "round" 
              }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-[20px] font-[800] text-text">
            {isExchange ? "교환 신청 완료! ✅" : "반품 신청 완료! ✅"}
          </h1>

          <p className="text-[13px] text-text-secondary leading-[1.8]">
            접수번호 <b className="text-text">{ticketNumber || (isExchange ? "EX-2025-0421" : "RT-2025-0312")}</b><br />
            {isExchange 
              ? "영업일 기준 1~2일 내에\n담당자가 연락드릴 예정이에요" 
              : "수거 기사가 영업일 1일 이내 방문 예정이에요"}
          </p>

          <div className="mt-1 w-full bg-[#F8F8F8] border border-[#E4E6EF] rounded-[12px] p-[14px_16px] text-left flex flex-col gap-2">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-text-secondary">신청 유형</span>
              <span className="font-bold text-text">{isExchange ? "교환" : "반품"}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-text-secondary">{isExchange ? "교환" : "반품"} 사유</span>
              <span className="font-bold text-text">{reason}</span>
            </div>
            
            {isExchange ? (
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-secondary">예상 처리일</span>
                <span className="font-bold text-text">영업일 2일</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-secondary">환불 수단</span>
                  <span className="font-bold text-text">{refundMethod === "original" ? "원결제 수단" : "계좌 입금"}</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-secondary">예상 환불일</span>
                  <span className="font-bold text-text">수거 후 3~5 영업일</span>
                </div>
                <div className="h-[1px] bg-[#E4E6EF] my-1" />
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-text-secondary">환불 예정액</span>
                  <span className="font-[800] text-[#ED4956]">{formatPrice(refundAmount)}원</span>
                </div>
              </>
            )}
          </div>

          {!isExchange && (
            <div className="w-full bg-[#FFF8E7] border border-[#FFE58F] rounded-[8px] p-[10px_14px] text-left">
              <div className="text-[11px] text-[#B7791F] leading-[1.8]">
                📦 수거 기사 배정 후 문자 안내 예정<br />
                🚚 기사 방문 전 상품을 포장해 두세요
              </div>
            </div>
          )}

          <button 
            className="mt-1 w-full h-[46px] bg-text text-white border-none rounded-[10px] text-[14px] font-bold cursor-pointer hover:bg-black transition-colors"
            style={{ backgroundColor: "#262626" }}
            onClick={() => router.push("/orders")}
          >
            주문 내역으로 돌아가기
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <BackTopBar title="교환/반품 신청" />

      <div className="flex-1 overflow-y-auto pb-6">
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
                  {item.color} · {item.quantity}개 · ₩{formatPrice((priceMap.get(item.productId) ?? item.product.price) * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

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
                <span className="text-[16px] font-bold text-text">{formatPrice(refundAmount)}원</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 px-4 py-5">
          <p className="mb-2.5 text-[11px] font-bold text-text-secondary">📋 안내 사항</p>
          <div className="text-[11px] text-text-muted leading-relaxed space-y-1">
            <p>• 배송 완료 후 7일 이내 신청 가능합니다.</p>
            <p>• 단순 변심 반품 시 왕복 배송비 6,000원이 부과됩니다.</p>
            <p>• 상품 불량/파손의 경우 무료 수거 후 처리됩니다.</p>
          </div>
        </div>
      </div>

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
    </>
  );
}
