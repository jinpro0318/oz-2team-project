"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Radio, App } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { useCartStore } from "@/stores/cartStore";
import { useCreateOrder } from "@/hooks/useOrders";
import { useAuthStore } from "@/stores/authStore";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5akZmejJb9YMxMB7G8Vj7Y4314A";

function formatPrice(n: number, mounted: boolean) {
  if (!mounted) return n.toString();
  return n.toLocaleString("ko-KR");
}

export default function CheckoutPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { items, getTotalAmount, clearCart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const createOrderMutation = useCreateOrder();

  const [mounted, setMounted] = useState(false);
  const [recipient, setRecipient] = useState(user?.nickname || "");
  const [phone, setPhone] = useState(user?.phone || "");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const totalAmount = getTotalAmount();
  const shippingFee = totalAmount >= 50000 ? 0 : 3000;
  const finalTotal = totalAmount + shippingFee;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleOpenPostcode = () => {
    if (typeof window !== "undefined" && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setZipCode(data.zonecode);
          setAddress(data.address);
        },
      }).open();
    } else {
      message.error("주소 서비스 로딩 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handlePayment = async () => {
    if (!recipient || !phone || !address) {
      message.warning("배송 정보를 모두 입력해주세요");
      return;
    }
    if (!user) {
      message.error("로그인이 필요합니다");
      return;
    }

    try {
      // 1. Create order in our database
      const order = await createOrderMutation.mutateAsync({
        userId: user.id,
        items: items.map((item) => ({
          productId: item.productId,
          product: item.product,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          price: item.product.price * item.quantity,
        })),
        shippingAddress: {
          id: `addr_${Date.now()}`,
          label: "배송지",
          recipient,
          phone,
          zipCode,
          address,
          addressDetail,
          isDefault: false,
        },
        paymentMethod,
        totalAmount,
        shippingFee,
      });

      // 2. Initialize TossPayments
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      
      // 3. Request payment
      const payment = tossPayments.payment({
        customerKey: user.id,
      });

      const redirectUrl = `${window.location.origin}/order-complete`;

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: finalTotal,
        },
        orderId: order.orderNumber,
        orderName: items.length > 1 ? `${items[0].product.name} 외 ${items.length - 1}건` : items[0].product.name,
        successUrl: redirectUrl,
        failUrl: redirectUrl,
        customerEmail: user.email,
        customerName: recipient,
      });

      // Clear cart will happen on order-complete page or success
    } catch (error: any) {
      if (error.code === "USER_CANCEL") {
        message.info("결제가 취소되었습니다");
      } else {
        console.error(error);
        message.error("주문 처리 중 오류가 발생했습니다");
      }
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="주문/결제" />

      <div className="flex-1 space-y-2">
        <section className="bg-surface px-3 py-4">
          <h3 className="mb-3 text-[15px] font-bold">배송 정보</h3>
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">받는 사람</label>
              <Input
                size="large"
                placeholder="이름"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">연락처</label>
              <Input
                size="large"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">배송지</label>
              <div className="flex gap-2">
                <Input size="large" placeholder="우편번호" value={zipCode} readOnly className="flex-1" />
                <Button size="large" onClick={handleOpenPostcode}>
                  주소 검색
                </Button>
              </div>
              <Input
                size="large"
                placeholder="기본 주소"
                value={address}
                readOnly
                className="mt-1.5"
              />
              <Input
                size="large"
                placeholder="상세 주소를 입력하세요"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        <section className="bg-surface px-3 py-4">
          <h3 className="mb-3 text-[15px] font-bold">배송 방법</h3>
          <Radio.Group
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
            className="space-y-2"
          >
            <Radio value="standard" className="block">
              <span className="text-sm">일반배송 (2~3일)</span>
              <span className="ml-2 text-xs text-text-secondary">
                {mounted && (shippingFee === 0 ? "무료" : `₩${formatPrice(shippingFee, mounted)}`)}
              </span>
            </Radio>
          </Radio.Group>
        </section>

        <section className="bg-surface px-3 py-4">
          <h3 className="mb-3 text-[15px] font-bold">주문 상품</h3>
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-b-0">
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                {item.product.imageUrls?.[0] ? (
                  <img src={item.product.imageUrls[0]} alt={item.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold">{item.product.name}</p>
                <p className="text-[11px] text-text-secondary">
                  {item.color} / {item.size} · {item.quantity}개
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold">₩{formatPrice(item.product.price * item.quantity, mounted)}</p>
            </div>
          ))}
        </section>

        <section className="bg-surface px-3 py-4 pb-8">
          <h3 className="mb-3 text-[15px] font-bold">결제 수단</h3>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#0064FF]/5 px-3 py-2">
            <span className="text-sm font-bold text-[#0064FF]">toss</span>
            <span className="text-xs text-text-secondary">TossPayments (테스트 모드)</span>
          </div>
          <Radio.Group
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="space-y-2"
          >
            <Radio value="card" className="block text-sm">신용/체크카드</Radio>
          </Radio.Group>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface px-3 py-3">
        <div className="mb-2 flex justify-between text-base font-bold">
          <span>총 결제 금액</span>
          <span>{mounted ? `₩${formatPrice(finalTotal, mounted)}` : "-"}</span>
        </div>
        <Button
          type="primary"
          block
          size="large"
          className="font-bold h-12"
          loading={createOrderMutation.isPending}
          onClick={handlePayment}
          style={{ background: "#262626", border: "none" }}
        >
          {mounted ? `₩${formatPrice(finalTotal, mounted)} 결제하기` : "결제하기"}
        </Button>
      </div>
    </div>
  );
}
