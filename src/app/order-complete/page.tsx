"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button, Result } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { Suspense } from "react";

function OrderCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("orderNumber") ?? "ORD-XXXX";
  const amount = searchParams.get("amount") ?? "0";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col items-center justify-center bg-surface px-6">
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
