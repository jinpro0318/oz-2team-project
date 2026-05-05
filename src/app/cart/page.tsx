"use client";

import { useRouter } from "next/navigation";
import { Button, InputNumber, Empty } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";
import { useCartStore } from "@/stores/cartStore";
import { useRequireAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useProducts } from "@/hooks/useProducts";
import { buildProductPriceMap, resolveUnitPrice } from "@/lib/utils/price";

function formatPrice(n: number, mounted: boolean) {
  if (!mounted) return n.toString();
  return n.toLocaleString("ko-KR");
}

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { items, removeItem, updateQuantity } = useCartStore();
  const { requireAuth } = useRequireAuth();
  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  useEffect(() => {
    setMounted(true);
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const getUnitPrice = (item: (typeof items)[number]) =>
    resolveUnitPrice(item.productId, item.product.price, priceMap);

  const totalAmount = items.reduce(
    (sum, item) => sum + getUnitPrice(item) * item.quantity,
    0
  );
  const shippingFee = totalAmount >= 50000 ? 0 : 3000;
  const finalTotal = totalAmount + shippingFee;

  if (!mounted) return null;

  const handleCheckout = () => {
    requireAuth(() => {
      router.push("/checkout");
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <BackTopBar title="장바구니" />

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-20">
            <Empty description="장바구니가 비어있습니다" />
          </div>
        ) : (
          <div className="flex flex-col">
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
                      className="cursor-pointer text-text-muted hover:text-error transition-colors"
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
                      ₩{formatPrice(getUnitPrice(item) * item.quantity, mounted)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-border bg-surface px-3 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">상품 금액</span>
              <span>₩{formatPrice(totalAmount, mounted)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">배송비</span>
              <span>{shippingFee === 0 ? "무료" : `₩${formatPrice(shippingFee, mounted)}`}</span>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex justify-between text-base font-bold">
                <span>결제 예정 금액</span>
                <span>₩{formatPrice(finalTotal, mounted)}</span>
              </div>
            </div>
          </div>
          <Button
            type="primary"
            block
            size="large"
            className="mt-4 font-bold bg-text border-none h-12"
            style={{ backgroundColor: "#262626" }}
            onClick={handleCheckout}
          >
            결제하기
          </Button>
        </div>
      )}
    </div>
  );
}
