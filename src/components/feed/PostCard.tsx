"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import HotspotImage from "./HotspotImage";
import { InstagramBar } from "./InstagramBar";
import type { Post, Celebrity, Hotspot } from "@/types";

interface PostCardProps {
  post: Post;
  celebrity: Celebrity;
}

const CELEB_LOCATIONS: Record<string, string> = {
  jennie: "파리, 프랑스",
  iu: "서울, 대한민국",
  v: "뉴욕, 미국",
};

function getPostLocation(post: Post, celebrity: Celebrity): string {
  if (post.id.includes("milano")) return "밀라노, 이탈리아";
  if (CELEB_LOCATIONS[celebrity.id]) return CELEB_LOCATIONS[celebrity.id];
  const fallbacks = ["런던, 영국", "도쿄, 일본", "로스앤젤레스, 미국", "베를린, 독일", "리스본, 포르투갈"];
  let hash = 0;
  for (let i = 0; i < celebrity.id.length; i++) hash = (hash * 31 + celebrity.id.charCodeAt(i)) >>> 0;
  return fallbacks[hash % fallbacks.length];
}

/**
 * [효진] 포스트 내부 다중 이미지 캐러셀
 * - state 기반 idx (스와이프/드래그·도트 클릭으로 전환)
 * - 활성 도트는 가로로 늘어남
 * - HotspotImage 의 imageIndex 필터 유지
 */
function ImageCarousel({
  images,
  hotspots,
  gradient,
  celebName,
}: {
  images: string[];
  hotspots: Hotspot[];
  gradient: string;
  celebName: string;
}) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);

  const goTo = (next: number) =>
    setIdx(Math.max(0, Math.min(images.length - 1, next)));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    dragging.current = true;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = startX.current - e.clientX;
    const dy = startY.current - e.clientY;
    // 수평 이동량이 수직보다 크고 50px 이상일 때만 전환 (세로 스크롤과 충돌 방지)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      goTo(idx + (dx > 0 ? 1 : -1));
    }
  };

  const onPointerLeave = () => {
    dragging.current = false;
  };

  return (
    <div
      className="relative"
      style={{ touchAction: "pan-y", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {images.map((url, i) => (
            <div key={i} className="w-full shrink-0">
              <HotspotImage
                imageUrl={url}
                hotspots={hotspots.filter((h) => (h.imageIndex ?? 0) === i)}
                gradient={gradient}
                celebName={celebName}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIdx(i)}
              aria-label={`${i + 1}번째 이미지로 이동`}
              className={`rounded-full transition-all duration-200 shadow-sm ${
                i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, celebrity }: PostCardProps) {
  return (
    <article className="bg-white mb-0.5 border-b border-border-light pb-2">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="instagram-gradient rounded-full p-[1.5px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-white bg-bg overflow-hidden">
            {celebrity.avatarUrl ? (
              <img src={celebrity.avatarUrl} alt={celebrity.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white"
                style={{ background: celebrity.gradient }}
              >
                {celebrity.name[0]}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold leading-tight text-text">
            {celebrity.name}
          </p>
          <p className="text-[11px] text-text-secondary leading-tight">
            {getPostLocation(post, celebrity)}
          </p>
        </div>
        <button className="hover:opacity-60 transition-opacity flex-shrink-0">
          <MoreHorizontal className="w-5 h-5 text-text" />
        </button>
      </div>

      {/* [효진] 포스트 내부 이미지 캐러셀 (다중 이미지 시 좌우 스와이프 + 클릭 가능한 도트) */}
      <ImageCarousel
        images={
          post.imageUrls && post.imageUrls.length > 0
            ? post.imageUrls
            : [post.imageUrl]
        }
        hotspots={post.hotspots || []}
        gradient={celebrity.gradient}
        celebName={celebrity.name}
      />



      {/* Actions */}
      <InstagramBar post={post} celebrity={celebrity} />

      {/* Caption */}
      <div className="px-3">
        <p className="text-[13.5px] leading-[1.5] text-text">
          <span className="font-bold mr-1.5">C.O.D.E</span>
          <span className="whitespace-pre-wrap">{post.caption}</span>
        </p>
        <p className="text-[10px] mt-1.5 uppercase tracking-wide text-text-muted">
          12시간 전
        </p>
      </div>
    </article>
  );
}
