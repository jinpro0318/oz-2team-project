"use client";

import { Star, ShoppingCart, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { useRequireAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useProducts } from "@/hooks/useProducts";
import type { Post, Celebrity } from "@/types";

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
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { data: products = [] } = useProducts();
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

  const handleCart = () => {
    requireAuth(() => {
      if (!firstProductId) {
        message.info("등록된 상품이 없습니다");
        return;
      }
      router.push(`/product/${firstProductId}`);
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
