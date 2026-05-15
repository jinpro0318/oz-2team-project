"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import BackTopBar from "@/components/common/BackTopBar";
import { useEvent } from "@/hooks/useEvents";
import { useProducts } from "@/hooks/useProducts";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = (params?.id as string) ?? "";

  const { data: eventData, isLoading: eventLoading } = useEvent(eventId);
  const { data: allProducts = [], isLoading: prodLoading } = useProducts();

  // 연결 상품: productIds 기준 필터 (visible 상품만 노출)
  const eventProducts = React.useMemo(() => {
    if (!eventData) return [];
    const idSet = new Set(eventData.productIds ?? []);
    return allProducts.filter((p) => idSet.has(p.id));
  }, [eventData, allProducts]);

  if (eventLoading || prodLoading) {
    return (
      <div className="w-full max-w-screen-md mx-auto bg-white min-h-screen">
        <BackTopBar title="이벤트" />
        <div className="p-10 text-center">로딩 중...</div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="w-full max-w-screen-md mx-auto bg-white min-h-screen">
        <BackTopBar title="이벤트" />
        <div className="p-10 text-center">이벤트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const heroImage = eventData.bannerImage || eventData.thumbnail;

  return (
    <div className="w-full max-w-screen-md mx-auto pb-[80px] bg-white min-h-screen">
      {/* [효진] 상단 헤더 — 뒤로가기 + 이벤트 제목 */}
      <BackTopBar title={eventData.title} />

      {/* [효진] 1. 상단 홍보 이미지 — 크롭 없이 전체 비율 그대로 노출 */}
      <div className="w-full bg-gray-50">
        {heroImage ? (
          <img
            src={heroImage}
            alt={eventData.title}
            className="block w-full h-auto"
          />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
      </div>

      {/* [효진] 2. 제목 + 본문 — 이미지 하단에 작게 정렬 */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-900 mb-1.5">
          {eventData.title}
        </h1>
        <p className="text-[12px] text-gray-500 leading-[1.6] whitespace-pre-line">
          {eventData.content}
        </p>
      </div>

      {/* [효진] 3. 연결 상품 — 카드 자체가 클릭 가능, 누르면 해당 상품 상세로 이동 */}
      <div className="px-4 py-4">
        <h2 className="text-[13px] font-bold text-gray-900 mb-3">
          이벤트 관련 상품
        </h2>
        {eventProducts.length === 0 ? (
          <p className="text-[12px] text-gray-500">연결된 상품이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {eventProducts.map((product) => {
              const thumbUrl = product.imageUrls?.[0] ?? "";
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => router.push(`/product/${product.id}`)}
                  aria-label={`${product.brand} ${product.name} 상품 페이지로 이동`}
                  className="flex flex-col gap-1.5 text-left cursor-pointer group"
                >
                  <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {product.brand}
                    </span>
                    <span className="text-[12px] text-gray-800 truncate">
                      {product.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {product.discount > 0 && (
                        <span className="text-[12px] font-bold text-red-500">
                          {product.discount}%
                        </span>
                      )}
                      <span className="text-[12px] font-bold text-gray-900">
                        {product.price.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
