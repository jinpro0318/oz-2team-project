"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import HotspotDot from "./HotspotDot";
import type { Hotspot } from "@/types";
import { useProducts } from "@/hooks/useProducts";
import { buildProductPriceMap, formatKRW } from "@/lib/utils/price";

interface HotspotImageProps {
  imageUrl: string;
  hotspots: Hotspot[];
  gradient: string;
  celebName: string;
}

export default function HotspotImage({
  imageUrl,
  hotspots = [],
  gradient,
  celebName,
}: HotspotImageProps) {
  const [showGuide, setShowGuide] = useState(hotspots.length > 0);
  const { data: products = [] } = useProducts();
  const priceMap = buildProductPriceMap(products);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#1a1a1a] cursor-pointer"
      style={{ aspectRatio: "4/5" }}
      onClick={() => setShowGuide(false)}
    >
      {/* Background/Placeholder - Figma Match */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-500"
        style={{ 
          background: gradient || "linear-gradient(160deg, #1a1414 0%, #3c2020 60%, #6B3030 100%)", 
          opacity: 1 
        }}
      >
        <div className="flex flex-col items-center justify-center opacity-40">
          <ImageIcon
            className="h-12 w-12 mb-2"
            strokeWidth={1}
            style={{ stroke: "#ffffff" }}
          />
          <p className="text-[13px] font-medium" style={{ color: "#ffffff" }}>
            패션 아이템
          </p>
        </div>
      </div>

      {/* Post Image (Only show if imageUrl is valid) */}
      
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${celebName}'s post`}
          className="h-full w-full object-cover absolute inset-0 z-10"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Hotspots */}
      <div className="relative z-20 w-full h-full">
        {hotspots.map((hs) => {
          const livePrice = priceMap.get(hs.productId);
          return (
            <HotspotDot
              key={hs.id}
              x={hs.left}
              y={hs.top}
              product={{
                id: hs.productId,
                name: hs.label,
                price: livePrice != null ? formatKRW(livePrice) : hs.price,
              }}
            />
          );
        })}

        {/* Guide Badge */}
        {showGuide && (
          <div
            className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            탭하여 상품 보기
          </div>
        )}
      </div>
    </div>
  );
}
