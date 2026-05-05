"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import HotspotImage from "./HotspotImage";
import { InstagramBar } from "./InstagramBar";
import type { Post, Celebrity } from "@/types";
import { useRequireAuth } from "@/hooks/useAuth";

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

export default function PostCard({ post, celebrity }: PostCardProps) {
  const { requireAuth } = useRequireAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

      {/* Image with Hotspots / Carousel */}
      <div className="relative">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar">
          {/* [효진] 모든 이미지를 HotspotImage로 감싸고, 각 인덱스에 맞는 핫스팟만 전달 */}
          {(post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl]).map((url, idx) => (
            <div key={idx} className="w-full shrink-0 snap-center relative">
              <HotspotImage
                imageUrl={url}
                // [효진] 해당 이미지 인덱스에 속하는 핫스팟만 필터링
                hotspots={(post.hotspots || []).filter(h => (h.imageIndex ?? 0) === idx)}
                gradient={celebrity.gradient}
                celebName={celebrity.name}
              />
            </div>
          ))}
        </div>

        {/* Indicator Dots */}
        {(post.imageUrls?.length || 1) > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
            {(post.imageUrls || [post.imageUrl]).map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-white/50 shadow-sm"
              />
            ))}
          </div>
        )}
      </div>



      {/* Actions & Likes */}
      <InstagramBar likes={post.likes} onLike={() => {}} />

      {/* Caption & Comments */}
      <div className="px-3">
        <p className="text-[13.5px] leading-[1.5] text-text">
          {/* [효진] 캡션 부분은 쇼핑몰 공식 계정 느낌을 주기 위해 작성자를 'C.O.D.E'로 고정했습니다. */}
          <span className="font-bold mr-1.5">C.O.D.E</span>
          <span className="whitespace-pre-wrap">{post.caption}</span>
        </p>

        {post.comments > 0 && (
          <button
            className="text-[13px] mt-1 text-text-secondary hover:text-text transition-colors"
            onClick={() => requireAuth()}
          >
            댓글 {mounted ? post.comments.toLocaleString() : post.comments}개 모두 보기
          </button>
        )}
        <p className="text-[10px] mt-1 uppercase tracking-wide text-text-muted">
          12시간 전
        </p>
      </div>

      {/* Comment Input (Figma Match) */}
      <div className="px-3 mt-3 flex items-center gap-2.5 border-t border-[#efefef] pt-3">
        <div
          className="w-7 h-7 rounded-full flex-shrink-0"
          style={{ background: "#E8E2D8" }}
        />
        <input
          type="text"
          placeholder="댓글 달기..."
          className="flex-1 text-[13px] outline-none bg-transparent text-text-muted"
          onClick={() => requireAuth()}
        />
      </div>
    </article>
  );
}
