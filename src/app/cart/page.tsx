"use client";

import { useRouter } from "next/navigation";
import { Button, InputNumber, Empty } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useCartStore } from "@/stores/cartStore";
import { useRequireAuth } from "@/hooks/useAuth";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotalAmount } = useCartStore();
  const { requireAuth } = useRequireAuth();
  const totalAmount = getTotalAmount();
  const shippingFee = totalAmount >= 50000 ? 0 : 3000;
  const finalTotal = totalAmount + shippingFee;

  const handleCheckout = () => {
    requireAuth(() => {
      router.push("/checkout");
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-bg">
      <BackTopBar title="장바구니" />

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Empty description="장바구니가 비어있습니다" />
        </div>
      ) : (
        <>
          <div className="flex-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-border-light bg-surface px-3 py-3.5"
              >
                <div className="h-[94px] w-[78px] shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.product.imageUrls?.[0] ? (
                    <img
                      src={item.product.imageUrls[0]}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        {item.product.brand}
                      </p>
                      <p className="text-[13px] font-bold">{item.product.name}</p>
                      <p className="text-[11px] text-text-secondary">
                        {item.color} / {item.size}
                      </p>
                    </div>
                    <DeleteOutlined
                      className="cursor-pointer text-text-muted"
                      onClick={() => removeItem(item.id)}
                    />
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <InputNumber
                      min={1}
                      max={10}
                      value={item.quantity}
                      size="small"
                      onChange={(val) => updateQuantity(item.id, val ?? 1)}
                    />
                    <p className="text-sm font-bold">
                      ₩{formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border bg-surface px-3 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">상품 금액</span>
                <span>₩{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">배송비</span>
                <span>{shippingFee === 0 ? "무료" : `₩${formatPrice(shippingFee)}`}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>결제 예정 금액</span>
                  <span>₩{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
            <Button
              type="primary"
              block
              size="large"
              className="mt-4 font-bold"
              onClick={handleCheckout}
            >
              결제하기
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
