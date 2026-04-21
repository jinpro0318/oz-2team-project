"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import HotspotDot from "./HotspotDot";
import type { Hotspot } from "@/types";

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

  return (
    <div
      className="relative w-full overflow-hidden bg-bg cursor-pointer"
      style={{ aspectRatio: "4/5" }}
      onClick={() => setShowGuide(false)}
    >
      {/* Background/Placeholder */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-500"
        style={{ background: gradient, opacity: imageUrl ? 0 : 1 }}
      >
        <ImageIcon
          className="h-10 w-10"
          strokeWidth={1}
          style={{ stroke: "rgba(255,255,255,0.35)" }}
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {celebName} 패션 아이템
        </p>
      </div>

      {/* Post Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${celebName}'s post`}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Hotspots */}
      {hotspots.map((hs) => (
        <HotspotDot
          key={hs.id}
          x={hs.left}
          y={hs.top}
          product={{
            name: hs.label,
            price: hs.price,
          }}
        />
      ))}

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
  );
}
