"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button, Spin, App } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { Suspense, useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { getOrderByNumber, updateOrderStatus } from "@/lib/services/order";

function OrderCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { message } = App.useApp();
  const clearCart = useCartStore((s) => s.clearCart);

  const [isConfirming, setIsConfirming] = useState(true);
  const [isError, setIsError] = useState(false);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const orderNumber = searchParams.get("orderNumber") || orderId || "ORD-XXXX";

  useEffect(() => {
    async function confirmPayment() {
      if (!paymentKey || !orderId || !amount) {
        setIsConfirming(false);
        return;
      }

      try {
        // 1. Check if the order is already completed to prevent double-confirmation errors
        if (orderNumber) {
          const orderDoc = await getOrderByNumber(orderNumber);
          if (orderDoc && orderDoc.status === "payment_complete") {
            clearCart();
            setIsConfirming(false);
            return;
          }
        }

        // 2. Call the API to confirm payment
        const response = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        if (response.ok) {
          // Update order status in Firestore
          if (orderNumber) {
            const orderDoc = await getOrderByNumber(orderNumber);
            if (orderDoc) {
              // [v11.2] 단순 상태 업데이트를 버리고 물류 엔진을 공식 가동 (PAYMENT_DONE)
              // [v14.9] 결제 취소를 위한 paymentKey를 엔진에 전달하여 DB에 영구 저장
              const { CodeFulfillmentEngine } = await import("@/lib/services/CodeFulfillmentEngine");
              await CodeFulfillmentEngine.executeAction(orderDoc.id, "PAYMENT_DONE", { paymentKey });
            }
          }
          clearCart();
          setIsConfirming(false);
        } else {
          // Check if it's already processed even if the response is not OK
          if (orderNumber) {
            const orderDoc = await getOrderByNumber(orderNumber);
            if (orderDoc && orderDoc.status === "payment_complete") {
              clearCart();
              setIsConfirming(false);
              return;
            }
          }
          setIsError(true);
          setIsConfirming(false);
        }
      } catch (error) {
        console.error(error);
        setIsError(true);
        setIsConfirming(false);
      }
    }

    confirmPayment();
  }, [paymentKey, orderId, amount, clearCart]);

  if (isConfirming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface">
        <Spin size="large" description="결제 확인 중..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <CloseCircleFilled className="text-3xl text-error" />
        </div>
        <h1 className="mb-2 text-xl font-bold">결제 실패</h1>
        <p className="mb-8 text-center text-sm text-text-secondary">
          결제 처리 중 오류가 발생했습니다.<br />고객센터로 문의해주세요.
        </p>
        <Button block size="large" type="primary" onClick={() => router.push("/checkout")}>
          다시 시도하기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircleFilled className="text-3xl text-success" />
      </div>
      <h1 className="mb-2 text-xl font-bold">결제가 완료되었습니다</h1>
      <p className="mb-1 text-sm text-text-secondary">주문이 정상적으로 접수되었습니다.</p>

      <div className="mt-6 w-full rounded-lg border border-border bg-bg px-4 py-4">
        <div className="flex justify-between border-b border-border-light pb-2 text-sm">
          <span className="text-text-secondary">주문번호</span>
          <span className="font-bold">{orderNumber}</span>
        </div>
        <div className="flex justify-between pt-2 text-sm">
          <span className="text-text-secondary">결제 금액</span>
          <span className="font-bold">₩{Number(amount).toLocaleString("ko-KR")}</span>
        </div>
      </div>

      <div className="mt-8 flex w-full flex-col gap-2">
        <Button
          type="primary"
          block
          size="large"
          className="font-bold"
          onClick={() => router.push("/orders")}
          style={{ background: "#262626", border: "none" }}
        >
          주문 내역 보기
        </Button>
        <Button
          block
          size="large"
          onClick={() => router.push("/feed")}
        >
          쇼핑 계속하기
        </Button>
      </div>
    </div>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">로딩 중...</div>}>
      <OrderCompleteContent />
    </Suspense>
  );
}
