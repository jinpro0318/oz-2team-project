"use client";

import { Empty, Button, Spin } from "antd";
import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import BackTopBar from "@/components/common/BackTopBar";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/stores/authStore";
import { updateUserLastChecked } from "@/lib/services/user";
import { buildProductPriceMap } from "@/lib/utils/price";

import { useUIStore } from "@/stores/uiStore";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function WishlistPage() {
  const { items, toggleWishlist, isLoading } = useWishlist();
  const { addToCart } = useCart();
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);
  const { user, setUser } = useAuthStore();
  const setHasNewWishlistItem = useUIStore((s) => s.setHasNewWishlistItem);

  // [디자인 요구사항] 진입 시점의 시간을 기억하여 'New' 표시 여부를 결정합니다.
  const [initialLastChecked] = useState(user?.lastCheckedWishlist || "0");

  useEffect(() => {
    if (!user) return;

    // 진입 즉시 알림 점 제거
    setHasNewWishlistItem(false);

    const markAsRead = () => {
      const now = new Date().toISOString();
      updateUserLastChecked(user.id, "lastCheckedWishlist").catch(console.error);
      setUser({ ...user, lastCheckedWishlist: now });
      setHasNewWishlistItem(false);
    };

    window.addEventListener("beforeunload", markAsRead);

    return () => {
      markAsRead();
      window.removeEventListener("beforeunload", markAsRead);
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <BackTopBar title="찜 목록" backUrl="/mypage" />
        <div className="flex flex-1 items-center justify-center py-20">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-[60px]">
      <BackTopBar 
        title="찜 목록" 
        rightAction={<span className="text-[13px] text-text-secondary font-medium">{items.length}개</span>}
      />

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Empty description="찜한 상품이 없습니다" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-3 pt-2 pb-[60px]">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <Link href={`/product/${item.productId}`}>
                <div className="aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                  {item.product.imageUrls?.[0] && (
                    <img src={item.product.imageUrls[0]} alt={item.product.name} className="h-full w-full object-cover" />
                  )}
                </div>
              </Link>
              <div className="p-2.5">
                <Link href={`/product/${item.productId}`}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-semibold uppercase text-text-muted">
                      {item.product.brand}
                    </p>
                    {item.addedAt > initialLastChecked && (
                      <span className="inline-flex h-3.5 items-center justify-center rounded-full bg-[#ED4956] px-1.5 text-[8px] font-bold text-white leading-none">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs font-bold text-text">{item.product.name}</p>
                </Link>
                <p className="mt-1 text-sm font-bold">₩{formatPrice(priceMap.get(item.productId) ?? item.product.price)}</p>
                <div className="mt-2 flex gap-1">
                  <Button
                    size="small"
                    icon={<ShoppingCartOutlined />}
                    block
                    onClick={() => {
                      addToCart(item.product, item.product.colors[0]?.name ?? "", item.product.sizes[0] ?? "");
                    }}
                  >
                    담기
                  </Button>
                  <Button
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => toggleWishlist(item.product)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
