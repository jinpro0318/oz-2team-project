"use client";

import { Star, ShoppingCart, Share2 } from "lucide-react";
import { App } from "antd";
import { useRequireAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useProducts } from "@/hooks/useProducts";
import { useCartStore } from "@/stores/cartStore";
import type { Post, Celebrity, Product } from "@/types";

function InstagramSvgIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface InstagramBarProps {
  post: Post;
  celebrity: Celebrity;
}

export function InstagramBar({ post, celebrity }: InstagramBarProps) {
  const { requireAuth } = useRequireAuth();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { data: products = [] } = useProducts();
  const addItem = useCartStore((s) => s.addItem);
  const { message } = App.useApp();

  const firstProductId = post.hotspots?.[0]?.productId;
  const firstProduct = firstProductId
    ? products.find((p) => p.id === firstProductId)
    : undefined;
  const wishlisted = firstProduct ? isWishlisted(firstProduct.id) : false;

  const handleWishlist = () => {
    if (!firstProduct) {
      message.info("등록된 상품이 없습니다");
      return;
    }
    toggleWishlist(firstProduct);
  };

  // [효진] 피드의 핫스팟에 연결된 모든 상품을 장바구니에 한 번에 담음
  const handleCart = () => {
    requireAuth(() => {
      // 핫스팟이 같은 상품을 여러 번 가리킬 수 있으니 중복 제거
      const productIds = Array.from(
        new Set(
          (post.hotspots ?? []).map((h) => h.productId).filter(Boolean)
        )
      );
      if (productIds.length === 0) {
        message.info("등록된 상품이 없습니다");
        return;
      }
      const matched = productIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));

      if (matched.length === 0) {
        message.info("상품 정보를 불러오지 못했습니다");
        return;
      }

      // 옵션 미지정 → 첫 번째 색상·사이즈를 기본값으로 사용
      matched.forEach((product) => {
        const color = product.colors?.[0]?.name ?? "default";
        const size = product.sizes?.[0] ?? "FREE_SIZE";
        addItem(product, color, size, 1);
      });

      message.success(`${matched.length}개 상품이 장바구니에 담겼습니다`);
    });
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${celebrity.name}의 착장`, url });
      } else {
        await navigator.clipboard.writeText(url);
        message.success("링크가 복사됐습니다");
      }
    } catch {
      // user cancelled share — no-op
    }
  };

  const handleInstagram = () => {
    const handle = celebrity.handle.replace(/^@/, "");
    window.open(`https://www.instagram.com/${handle}/`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleWishlist}
            className="hover:opacity-60 transition-opacity"
            aria-label="찜하기"
          >
            <Star
              className="w-[23px] h-[23px] text-text"
              fill={wishlisted ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
          <button
            onClick={handleCart}
            className="hover:opacity-60 transition-opacity"
            aria-label="장바구니 담기"
          >
            <ShoppingCart className="w-[23px] h-[23px] text-text" strokeWidth={1.8} />
          </button>
          <button
            onClick={handleShare}
            className="hover:opacity-60 transition-opacity"
            aria-label="피드 공유"
          >
            <Share2 className="w-[23px] h-[23px] text-text" strokeWidth={1.8} />
          </button>
        </div>
        <button
          onClick={handleInstagram}
          className="hover:opacity-60 transition-opacity"
          aria-label="셀럽 인스타그램"
        >
          <InstagramSvgIcon className="w-[23px] h-[23px] text-text" />
        </button>
      </div>
    </div>
  );
}
