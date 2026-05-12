"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useAuth"; // 팀 경로에 맞게 자동완성 필요할 수 있음
import { useCartStore } from "@/stores/cartStore";

// --- 테스트용 임시 데이터 (나중에 Firebase 데이터로 교체될 부분) ---
const MOCK_EVENT = {
  id: "1",
  title: "[단독] 여름 맞이 바캉스 특별전!",
  content: "올여름 휴가를 완벽하게 만들어줄 베스트 아이템들을 최대 50% 할인된 가격에 만나보세요.\n한정 수량으로 진행되니 지금 바로 확인하세요!",
  thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  productIds: ["p1", "p2", "p3", "p4"],
};

const MOCK_PRODUCTS = [
  { id: "p1", name: "시원한 린넨 셔츠", brand: "JUNEWORKS", price: 45000, discountRate: 20, imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=400&q=80" },
  { id: "p2", name: "바캉스 와이드 팬츠", brand: "JUNEWORKS", price: 55000, discountRate: 10, imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80" },
  { id: "p3", name: "비치 샌들", brand: "SUMMER", price: 30000, discountRate: 0, imageUrl: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&q=80" },
  { id: "p4", name: "자외선 차단 선글라스", brand: "SHADOW", price: 89000, discountRate: 30, imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80" },
];
// --------------------------------------------------------

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();

  // 실제 훅 연결 전 임시 데이터 사용
  const eventData = MOCK_EVENT;
  const eventProducts = MOCK_PRODUCTS;

  // 효진님이 만든 로그인 차단 훅 & 신우님이 세팅한 장바구니 스토어 호출
  const { requireAuth } = useRequireAuth();
  const addItem = useCartStore((state) => state.addItem);

  // 장바구니 담기 핸들러 (비로그인 차단 로직 적용!)
  const handleAddToCart = (product: any) => {
    requireAuth(() => {
      // 이벤트 페이지에서 장바구니 담을 때 기본 옵션으로 넘어감
      addItem(product, "default_color", "FREE_SIZE", 1);
      alert(`${product.name}이(가) 장바구니에 담겼습니다!`);
    });
  };

  if (!eventData) return <div className="p-10 text-center">로딩 중...</div>;

  return (
    <div className="w-full max-w-screen-md mx-auto pb-[150px] bg-white min-h-screen">
      {/* 1. 상단 이벤트 배너 및 본문 */}
      <div className="w-full">
        <img
          src={eventData.thumbnail}
          alt={eventData.title}
          className="w-full h-auto aspect-video object-cover"
        />
      </div>

      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{eventData.title}</h1>
        <p className="text-base text-gray-600 leading-relaxed whitespace-pre-line">
          {eventData.content}
        </p>
      </div>

      {/* 2. 연관 상품 리스트 (2열 그리드) */}
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">이벤트 관련 상품</h2>
        <div className="grid grid-cols-2 gap-4">
          {eventProducts.map((product) => (
            <div key={product.id} className="flex flex-col gap-2">
              {/* 썸네일 (클릭 시 상품 상세 이동) */}
              <div
                className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => router.push(`/product/${product.id}`)}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>

              {/* 상품 정보 */}
              <div
                className="flex flex-col cursor-pointer"
                onClick={() => router.push(`/product/${product.id}`)}
              >
                <span className="text-xs font-bold text-gray-500">{product.brand}</span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {product.name}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  {product.discountRate > 0 && (
                    <span className="text-sm font-bold text-red-500">
                      {product.discountRate}%
                    </span>
                  )}
                  <span className="text-sm font-bold text-gray-900">
                    {product.price.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 장바구니 담기 버튼 (로그인 차단 방패 적용 완료) */}
              <button
                onClick={() => handleAddToCart(product)}
                className="mt-2 w-full py-2 bg-gray-900 text-white text-sm font-bold rounded-md hover:bg-gray-800 transition-colors"
              >
                장바구니 담기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}