"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Radio, App } from "antd";
import BackTopBar from "@/components/common/BackTopBar";
import { useCartStore } from "@/stores/cartStore";
import { useCreateOrder } from "@/hooks/useOrders";
import { useAuthStore } from "@/stores/authStore";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

import { useUIStore } from "@/stores/uiStore";
import { useProducts } from "@/hooks/useProducts";
import { buildProductPriceMap, resolveUnitPrice } from "@/lib/utils/price";

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string;

// Next.js 가 정적 prerender 시도하면 useSearchParams Suspense 에러로 빌드 실패하므로
// 페이지 자체를 강제 동적 렌더로 표기 (Vercel 빌드 통과용).
export const dynamic = "force-dynamic";

function formatPrice(n: number, mounted: boolean) {
  if (!mounted) return n.toString();
  return n.toLocaleString("ko-KR");
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { items: cartItems } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const createOrderMutation = useCreateOrder();
  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  // URL 쿼리 파라미터 읽기 (바로 구매용)
  const pId = searchParams.get("productId");
  const pColor = searchParams.get("color");
  const pSize = searchParams.get("size");
  const pQuantity = Number(searchParams.get("quantity") || "1");

  // 결제 대상 상품 목록 결정
  const checkoutItems = useMemo(() => {
    if (pId && products.length > 0) {
      const product = products.find((p) => p.id === pId);
      if (product) {
        return [
          {
            id: `direct-${pId}`,
            productId: pId,
            product,
            color: pColor || "",
            size: pSize || "",
            quantity: pQuantity,
          },
        ];
      }
    }
    return cartItems;
  }, [pId, pColor, pSize, pQuantity, products, cartItems]);

  const getUnitPrice = (item: (typeof checkoutItems)[number]) =>
    resolveUnitPrice(item.productId, item.product.price, priceMap);

  const getDisplayImage = (item: (typeof checkoutItems)[number]) => {
    const colorImage = item.product.colors?.find((c) => c.name === item.color)?.imageUrl;
    return colorImage || item.product.imageUrls?.[0];
  };

  const [mounted, setMounted] = useState(false);
  const [recipient, setRecipient] = useState(user?.nickname || "");
  const [phone, setPhone] = useState(user?.phone || "");

  useEffect(() => {
    setMounted(true);
    setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const totalAmount = checkoutItems.reduce(
    (sum, item) => sum + getUnitPrice(item) * item.quantity,
    0
  );
  const shippingFee = totalAmount >= 50000 ? 0 : 3000;
  const finalTotal = totalAmount + shippingFee;

  const { openPostcode } = useDaumPostcode();

  const handleOpenPostcode = () => {
    openPostcode(({ zonecode, address }) => {
      setZipCode(zonecode);
      setAddress(address);
    });
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
    if (checkoutItems.length === 0) {
      message.error("결제할 상품이 없습니다");
      return;
    }

    let createdOrderId = ""; // [무결성] catch 블록에서도 ID를 기억하기 위함
    let heartbeatInterval: NodeJS.Timeout | undefined;

    try {
      // 1. Create order in our database
      const order = await createOrderMutation.mutateAsync({
        userId: user.id,
        items: checkoutItems.map((item) => {
          const unit = getUnitPrice(item);
          const livePrice = priceMap.get(item.productId);
          const product =
            livePrice != null
              ? { ...item.product, price: livePrice }
              : item.product;
          return {
            productId: item.productId,
            product,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: unit * item.quantity,
          };
        }),
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

      createdOrderId = order.id;

      // [결제 무결성] 2. 토스 SDK 호출 전 하트비트(생존 신고) 타이머 가동 (30초 간격)
      heartbeatInterval = setInterval(() => {
        fetch("/api/payment/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: createdOrderId }),
        }).catch(() => {}); // 조용히 무시
      }, 30000);

      // 3. Request payment via standard SDK (V2 syntax)
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({
        customerKey: user.id.replace(/[^a-zA-Z0-9\-_=.@]/g, "") || "ANONYMOUS"
      });
      
      const redirectUrl = `${window.location.origin}/order-complete`;

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: finalTotal,
        },
        orderId: order.orderNumber,
        orderName:
          checkoutItems.length > 1
            ? `${checkoutItems[0].product.name} 외 ${checkoutItems.length - 1}건`
            : checkoutItems[0].product.name,
        successUrl: redirectUrl,
        failUrl: redirectUrl,
        customerEmail: user.email,
        customerName: recipient,
      });
    } catch (error: any) {
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      if (error.code === "USER_CANCEL") {
        message.info("결제가 취소되었습니다");
        
        // [결제 무결성] 취소 즉시 파기 명령 하달
        if (createdOrderId) {
          fetch("/api/payment/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: createdOrderId }), 
          }).catch(console.error);
        }

      } else {
        console.error(error);
        message.error("주문 처리 중 오류가 발생했습니다");
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col bg-surface">
      <BackTopBar title="주문/결제" />

      <div className="space-y-2 pb-32">
        <section className="bg-surface px-3 py-4">
          <h3 className="mb-3 text-[15px] font-bold">배송 정보</h3>
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                받는 사람
              </label>
              <Input
                size="large"
                placeholder="이름"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                연락처
              </label>
              <Input
                size="large"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                배송지
              </label>
              <div className="flex gap-2">
                <Input
                  size="large"
                  placeholder="우편번호"
                  value={zipCode}
                  readOnly
                  className="flex-1"
                />
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
                {mounted &&
                  (shippingFee === 0
                    ? "무료"
                    : `₩${formatPrice(shippingFee, mounted)}`)}
              </span>
            </Radio>
          </Radio.Group>
        </section>

        <section className="bg-surface px-3 py-4">
          <h3 className="mb-3 text-[15px] font-bold">주문 상품</h3>
          {checkoutItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 border-b border-border-light last:border-b-0"
            >
              <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                {getDisplayImage(item) ? (
                  <img
                    src={getDisplayImage(item)}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
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
              <p className="shrink-0 text-sm font-bold">
                ₩{formatPrice(getUnitPrice(item) * item.quantity, mounted)}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-surface px-3 py-4 pb-8">
          <h3 className="mb-3 text-[15px] font-bold">결제 수단</h3>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#0064FF]/5 px-3 py-2">
            <span className="text-sm font-bold text-[#0064FF]">toss</span>
            <span className="text-xs text-text-secondary">
              TossPayments (테스트 모드)
            </span>
          </div>
          <Radio.Group
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="space-y-2"
          >
            <Radio value="card" className="block text-sm">
              신용/체크카드
            </Radio>
          </Radio.Group>

          {/* [v14.12] Toss Sandbox 간편결제 Envoy 게이트웨이 크래시 방지 UX 가이드 */}
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 backdrop-blur-sm">
            <div className="flex gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-amber-800 tracking-tight leading-none">
                  테스트(샌드박스) 환경 결제 가이드
                </span>
                <p className="text-[10px] text-amber-700/80 leading-normal mt-1.5 font-medium tracking-tight">
                  토스페이먼츠 테스트 서버의 자체 간편결제 게이트웨이 장애로 인해 **Npay(네이버페이) 등 간편결제** 진행 시 <code className="bg-amber-100/50 px-1 py-0.5 rounded font-mono font-bold">no healthy upstream</code> 오류가 발생합니다.
                </p>
                <p className="text-[10px] text-amber-800 font-bold leading-normal mt-1.5 tracking-tight">
                  👉 결제창에서 <strong>[신용/체크카드]</strong> 탭을 선택하고 아무 가상 카드를 선택해 진행해 주시면 정상적으로 결제가 완료됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-[49px] border-t border-border bg-surface px-3 py-3 z-40">
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
          {mounted
            ? `₩${formatPrice(finalTotal, mounted)} 결제하기`
            : "결제하기"}
        </Button>
      </div>
    </div>
  );
}


export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          로딩 중...
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
