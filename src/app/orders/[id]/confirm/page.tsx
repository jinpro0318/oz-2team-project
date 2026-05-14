"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, App, Spin } from "antd";
import { CheckCircleFilled, GiftOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import BottomNav from "@/components/common/BottomNav";
import { useOrder, useExecuteOrderAction } from "@/hooks/useOrders";
import { addUserPoints } from "@/lib/services/user";
import { useAuthStore } from "@/stores/authStore";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function PurchaseConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: order, isLoading } = useOrder(id);
  const executeActionMutation = useExecuteOrderAction();

  const [isComplete, setIsComplete] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const { user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="구매 결정" />
        <div className="flex flex-1 items-center justify-center">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col">
        <BackTopBar title="구매 결정" />
        <div className="flex flex-1 items-center justify-center text-text-secondary">
          주문을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    try {
      const points = Math.floor(order.totalAmount * 0.01);
      
      // 1. [v12.5] 물류 엔진을 통한 지능형 상태 동기화 (주문+배송 통합 업데이트)
      await executeActionMutation.mutateAsync({
        id: order.id,
        action: "PURCHASE_CONFIRM",
      });

      // 2. 포인트 적립 (로그인 유저인 경우)
      if (user?.id) {
        await addUserPoints(user.id, points);
        setEarnedPoints(points);
      }

      setIsComplete(true);
    } catch (err: any) {
      console.error(err);
      message.error("구매 결정 처리 중 오류가 발생했습니다");
    }
  };

  if (isComplete) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
        <BackTopBar title="구매 결정 완료" />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircleFilled className="text-3xl text-success" />
          </div>
          <h1 className="mb-2 text-xl font-bold">구매가 확정되었습니다</h1>
          <div className="mb-6 rounded-lg bg-primary/5 px-4 py-2 text-primary font-bold text-sm">
            + {formatPrice(earnedPoints)}P 적립 완료
          </div>
          <p className="text-center text-sm text-text-secondary">
            상품 구매를 확정해주셔서 감사합니다.<br />지금 바로 적립된 포인트를 확인해보세요!
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              type="primary"
              block
              size="large"
              className="font-bold h-12"
              onClick={() => router.push("/orders")}
              style={{ background: "#262626", border: "none" }}
            >
              주문 내역으로
            </Button>
            <Button
              block
              size="large"
              className="font-bold h-12"
              onClick={() => router.push("/feed")}
            >
              쇼핑 계속하기
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="구매 결정" />

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold">구매하신 상품은 만족하시나요?</h2>
          <p className="mt-1 text-sm text-text-secondary">구매 결정을 하시면 반품/교환 신청이 불가합니다.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-xs font-bold text-text-secondary uppercase tracking-wider">구매 상품 목록</h3>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="h-16 w-14 shrink-0 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-text-muted uppercase">{item.product.brand}</p>
                  <p className="truncate text-sm font-bold">{item.product.name}</p>
                  <p className="text-xs text-text-secondary">
                    {item.color} / {item.size} · {item.quantity}개
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-primary/5 p-4 flex items-start gap-3">
          <GiftOutlined className="mt-0.5 text-primary text-lg" />
          <div>
            <p className="text-sm font-bold text-primary">포인트 적립 안내</p>
            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
              구매 확정 시 결제 금액의 1%가 포인트로 적립됩니다. 리뷰를 작성하시면 추가 포인트가 지급됩니다.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-bg p-4">
          <p className="text-[11px] text-text-muted leading-relaxed">
            · 구매 결정 후에는 단순 변심으로 인한 반품 및 교환이 불가능합니다.<br />
            · 상품에 결함이 있는 경우 고객센터로 문의해주세요.
          </p>
        </div>
      </div>

      <div className="sticky bottom-[49px] border-t border-border bg-surface px-4 py-3">
        <Button
          type="primary"
          block
          size="large"
          className="font-bold h-12"
          loading={executeActionMutation.isPending}
          onClick={handleConfirm}
          style={{ background: "#262626", border: "none" }}
        >
          구매 결정하기
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
