"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import HotspotImage from "./HotspotImage";
import { InstagramBar } from "./InstagramBar";
import type { Post, Celebrity } from "@/types";

interface PostCarouselProps {
  posts: Post[];
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
  let h = 0;
  for (let i = 0; i < celebrity.id.length; i++) h = (h * 31 + celebrity.id.charCodeAt(i)) >>> 0;
  return fallbacks[h % fallbacks.length];
}

function ImageViewer({
  images,
  hotspots,
  gradient,
  celebName,
}: {
  images: string[];
  hotspots: import("@/types").Hotspot[];
  gradient: string;
  celebName: string;
}) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="relative">
      <HotspotImage
        imageUrl={images[idx]}
        hotspots={hotspots.filter((h) => (h.imageIndex ?? 0) === idx)}
        gradient={gradient}
        celebName={celebName}
      />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-200 ${
                i === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostSlide({ post, celebrity }: { post: Post; celebrity: Celebrity }) {
  const images =
    post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl];

  return (
    <article className="bg-white border-b border-border-light pb-2">
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
          <p className="text-[13px] font-bold leading-tight text-text">{celebrity.name}</p>
          <p className="text-[11px] text-text-secondary leading-tight">
            {getPostLocation(post, celebrity)}
          </p>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          className="hover:opacity-60 transition-opacity flex-shrink-0"
        >
          <MoreHorizontal className="w-5 h-5 text-text" />
        </button>
      </div>

      <ImageViewer
        images={images}
        hotspots={post.hotspots || []}
        gradient={celebrity.gradient}
        celebName={celebrity.name}
      />

      {/* 액션 버튼들 — pointer 이벤트가 캐러셀로 전파되지 않도록 차단 */}
      <div onPointerDown={(e) => e.stopPropagation()}>
        <InstagramBar post={post} celebrity={celebrity} />
      </div>

      <div className="px-3" onPointerDown={(e) => e.stopPropagation()}>
        <p className="text-[13.5px] leading-[1.5] text-text">
          <span className="font-bold mr-1.5">C.O.D.E</span>
          <span className="whitespace-pre-wrap">{post.caption}</span>
        </p>
        <p className="text-[10px] mt-1.5 uppercase tracking-wide text-text-muted">12시간 전</p>
      </div>
    </article>
  );
}

export default function PostCarousel({ posts, celebrity }: PostCarouselProps) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);

  useEffect(() => { setIdx(0); }, [celebrity?.id]);

  if (!posts.length || !celebrity) return null;

  const goTo = (next: number) =>
    setIdx(Math.max(0, Math.min(posts.length - 1, next)));

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
    // 수평 이동이 수직보다 크고 50px 이상일 때만 전환
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      goTo(idx + (dx > 0 ? 1 : -1));
    }
  };

  const onPointerLeave = () => {
    dragging.current = false;
  };

  return (
    <div
      // pan-y: 수직 스크롤은 브라우저, 수평은 JS(포인터 이벤트)로
      style={{ touchAction: "pan-y", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {posts.map((post) => (
            <div key={post.id} className="w-full shrink-0">
              <PostSlide post={post} celebrity={celebrity} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
