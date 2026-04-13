"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Hotspot } from "@/types";

interface HotspotImageProps {
  imageUrl: string;
  hotspots: Hotspot[];
  gradient: string;
  celebName: string;
}

export default function HotspotImage({ imageUrl, hotspots, gradient, celebName }: HotspotImageProps) {
  const router = useRouter();
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  const handleHotspotClick = (hotspot: Hotspot) => {
    if (activeHotspot === hotspot.id) {
      router.push(`/product/${hotspot.productId}`);
    } else {
      setActiveHotspot(hotspot.id);
    }
  };

  const handleImageClick = () => {
    setActiveHotspot(null);
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "4/5" }}
      onClick={handleImageClick}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2"
        style={{ background: gradient }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="text-xs text-white/35">{celebName} Feed Image</p>
      </div>

      {hotspots.map((hs) => (
        <div key={hs.id}>
          <button
            className="hotspot-pulse absolute flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white/85 bg-white/20"
            style={{ top: `${hs.top}%`, left: `${hs.left}%`, transform: "translate(-50%, -50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              handleHotspotClick(hs);
            }}
          >
            <span className="block h-2.5 w-2.5 rounded-full bg-white" />
          </button>

          {activeHotspot === hs.id && (
            <div
              className="absolute z-20 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-bold text-text shadow-md cursor-pointer"
              style={{
                top: `${hs.top}%`,
                left: `${hs.left}%`,
                transform: `translate(${hs.left > 60 ? "-100%" : "10px"}, -120%)`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/product/${hs.productId}`);
              }}
            >
              {hs.label}
              <span className="ml-1 text-[10px] font-normal text-text-secondary">{hs.price}</span>
            </div>
          )}
        </div>
      ))}

      <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
        상품 탭을 눌러보세요
      </div>
    </div>
  );
}
