"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, App, Spin } from "antd";
import {
  LeftOutlined,
  PhoneOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { Star } from "lucide-react";
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
  const colorData = product.colors.find(c => c.name === activeColor);
  
  // [효진] 선택된 색상에 연결된 이미지가 있으면 우선 노출, 없으면 기본 이미지 노출
  const mainImageUrl = colorData?.imageUrl || product.imageUrls?.[0];

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
    <div className="flex flex-col bg-surface min-h-screen">
      <TopBar />
      <div className="relative aspect-square w-full flex-shrink-0 bg-gray-100">
        {mainImageUrl ? (
          <img
            src={mainImageUrl}
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
          <span className="text-sm">
            <LeftOutlined />
          </span>
        </button>
        <button
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          onClick={() => requireAuth(() => toggleWishlist(product))}
        >
          {wishlisted ? (
            <Star className="w-[20px] h-[20px] text-black fill-[#FFD700]" strokeWidth={2} />
          ) : (
            <Star className="w-[20px] h-[20px] text-text" strokeWidth={1.5} />
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
        <div className="flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c.name}
              className={`flex items-center justify-center rounded-lg border px-4 py-2 text-xs transition-all ${
                activeColor === c.name
                  ? "border-text border-2 font-bold text-text bg-gray-50"
                  : "border-border text-text-secondary hover:border-gray-400"
              }`}
              onClick={() => setSelectedColor(c.name)}
            >
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
        <p className="text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap">{product.description}</p>
        
        {/* [효진] 추가 이미지들을 상세 설명 영역에 순차적으로 노출 */}
        {product.imageUrls && product.imageUrls.length > 1 && (
          <div className="mt-6 space-y-2">
            {product.imageUrls.slice(1).map((url, idx) => (
              <img 
                key={idx} 
                src={url} 
                alt={`${product.name} detail ${idx + 1}`} 
                className="w-full h-auto rounded-lg"
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-border px-3 py-3.5">
        <h4 className="mb-2.5 text-[13px] font-bold">상품 정보</h4>
        {product.specs ? (
          <div className="text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap py-1">
            {product.specs}
          </div>
        ) : (
          <p className="text-xs text-text-muted py-2">등록된 상세 정보가 없습니다.</p>
        )}
      </div>



      <div className="border-b border-border px-3 py-3.5">
        <div className="flex items-center gap-2">
          <PhoneOutlined className="text-text-secondary" />
          <span className="text-xs text-text-secondary">
            고객센터 <strong className="text-text">1588-1234</strong> (평일 09:00~18:00)
          </span>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-border bg-surface px-3 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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
