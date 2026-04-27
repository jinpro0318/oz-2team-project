"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, App, Spin } from "antd";
import {
  LeftOutlined,
  HeartOutlined,
  HeartFilled,
  PhoneOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { useProduct } from "@/hooks/useProducts";
import { useCelebrity } from "@/hooks/useCelebrities";
import { useCartStore } from "@/stores/cartStore";
import { useWishlist } from "@/hooks/useWishlist";
import { useRequireAuth } from "@/hooks/useAuth";
import TopBar from "@/components/common/TopBar";

function formatPrice(n: number, mounted: boolean) {
  if (!mounted) return n.toString();
  return n.toLocaleString("ko-KR");
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { message } = App.useApp();

  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: celebrity } = useCelebrity(product?.celebrityId ?? "");

  const [mounted, setMounted] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { requireAuth } = useRequireAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    setMounted(true);
  }, []);

  const wishlisted = product && mounted ? isWishlisted(product.id) : false;

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  if (productLoading || !mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-text-secondary">상품을 찾을 수 없습니다</p>
      </div>
    );
  }

  const activeColor = selectedColor || product.colors[0]?.name || "";

  const handleAddToCart = () => {
    if (!selectedSize) {
      message.warning("사이즈를 선택해주세요");
      return;
    }
    addItem(product, activeColor, selectedSize);
    message.success("장바구니에 담았습니다");
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      message.warning("사이즈를 선택해주세요");
      return;
    }
    requireAuth(() => {
      addItem(product, activeColor, selectedSize);
      router.push("/cart");
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-[390px] flex-col bg-surface">
      <TopBar />
      <div className="relative aspect-square w-full flex-shrink-0 bg-gray-100">
        {product.imageUrls?.[0] ? (
          <img
            src={product.imageUrls[0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: celebrity?.gradient || "#eee" }}
          >
            <p className="text-sm text-white/40">{product.name}</p>
          </div>
        )}
        <button
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          onClick={() => router.back()}
        >
          <LeftOutlined className="text-sm" />
        </button>
        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          onClick={() => requireAuth(() => toggleWishlist(product))}
        >
          {wishlisted ? (
            <HeartFilled className="text-sm text-error" />
          ) : (
            <HeartOutlined className="text-sm" />
          )}
        </button>
      </div>

      {celebrity && (
        <div className="flex items-center gap-2 border-b border-border bg-bg px-3 py-2.5 cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-[8px] font-bold text-white">
            {celebrity.name[0]}
          </div>
          <p className="flex-1 text-xs text-text">
            <strong>{celebrity.name}</strong>{" "}
            <span className="text-text-secondary">착용</span>
          </p>
        </div>
      )}

      <div className="border-b border-border px-3 py-3.5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {product.brand}
        </p>
        <h1 className="mb-2 text-lg font-bold leading-tight">{product.name}</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold">₩{formatPrice(product.price, mounted)}</span>
          {product.originalPrice > product.price && (
            <>
              <span className="text-sm text-text-muted line-through">
                ₩{formatPrice(product.originalPrice, mounted)}
              </span>
              <span className="text-[13px] font-bold text-error">{product.discount}%</span>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          누적 판매 <strong className="text-text">{formatPrice(product.salesCount, mounted)}</strong>개
        </p>
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <p className="mb-2.5 text-[13px] font-bold">색상</p>
        <div className="flex gap-2">
          {product.colors.map((c) => (
            <button
              key={c.name}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                activeColor === c.name
                  ? "border-text font-bold text-text"
                  : "border-border text-text-secondary"
              }`}
              onClick={() => setSelectedColor(c.name)}
            >
              <span
                className="block h-3 w-3 rounded-full border border-border"
                style={{ background: c.hex }}
              />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <p className="mb-2.5 text-[13px] font-bold">사이즈</p>
        <div className="flex flex-wrap gap-1.5">
          {product.sizes.map((s) => (
            <button
              key={s}
              className={`flex min-w-[46px] items-center justify-center rounded-lg border px-2.5 py-2 text-[13px] ${
                selectedSize === s
                  ? "border-2 border-text font-bold text-text"
                  : "border-border text-text-secondary"
              }`}
              onClick={() => setSelectedSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <TruckOutlined className="text-success" />
        <span className="text-xs text-text-secondary">
          <strong className="text-text">무료배송</strong> · 내일 출발 예정
        </span>
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <h4 className="mb-2 text-[13px] font-bold">상품 설명</h4>
        <p className="text-[13px] leading-relaxed text-text-secondary">{product.description}</p>
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <h4 className="mb-2.5 text-[13px] font-bold">상품 정보</h4>
        {Object.entries(product.specs).map(([k, v]) => (
          <div key={k} className="flex border-b border-border-light py-1.5 text-xs last:border-b-0">
            <span className="w-[88px] shrink-0 text-text-secondary">{k}</span>
            <span className="font-medium text-text">{v}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <div className="flex items-center gap-2">
          <PhoneOutlined className="text-text-secondary" />
          <span className="text-xs text-text-secondary">
            고객센터 <strong className="text-text">1588-1234</strong> (평일 09:00~18:00)
          </span>
        </div>
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface px-3 py-2.5">
        <Button
          size="large"
          className="flex-1 font-bold"
          onClick={handleAddToCart}
        >
          장바구니
        </Button>
        <Button
          type="primary"
          size="large"
          className="flex-[2] font-bold"
          style={{ background: "#262626" }}
          onClick={handleBuyNow}
        >
          바로 구매
        </Button>
      </div>
    </div>
  );
}
