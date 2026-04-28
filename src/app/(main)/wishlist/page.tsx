"use client";

import { Empty, Button, Spin } from "antd";
import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import Link from "next/link";
import TopBar from "@/components/common/TopBar";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function WishlistPage() {
  const { items, toggleWishlist, isLoading } = useWishlist();
  const { addToCart } = useCart();

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <TopBar />
        <div className="flex flex-1 items-center justify-center py-20">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopBar />

      <div className="px-3 py-3">
        <h2 className="text-lg font-bold">찜 목록</h2>
        <p className="text-xs text-text-secondary">{items.length}개</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Empty description="찜한 상품이 없습니다" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-3 pb-4">
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
                  <p className="text-[10px] font-semibold uppercase text-text-muted">
                    {item.product.brand}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-text">{item.product.name}</p>
                </Link>
                <p className="mt-1 text-sm font-bold">₩{formatPrice(item.product.price)}</p>
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
