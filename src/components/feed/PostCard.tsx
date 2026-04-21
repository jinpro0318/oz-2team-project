"use client";

import { MoreHorizontal } from "lucide-react";
import HotspotImage from "./HotspotImage";
import { InstagramBar } from "./InstagramBar";
import type { Post, Celebrity } from "@/types";
import { useRequireAuth } from "@/hooks/useAuth";

interface PostCardProps {
  post: Post;
  celebrity: Celebrity;
}

export default function PostCard({ post, celebrity }: PostCardProps) {
  const { requireAuth } = useRequireAuth();

  return (
    <article className="bg-surface mb-1 border-b border-border-light">
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
            {celebrity.handle}
          </p>
        </div>
        <button className="hover:opacity-60 transition-opacity flex-shrink-0">
          <MoreHorizontal className="w-5 h-5 text-text" />
        </button>
      </div>

      {/* Image with Hotspots */}
      <HotspotImage
        imageUrl={post.imageUrl}
        hotspots={post.hotspots}
        gradient={celebrity.gradient}
        celebName={celebrity.name}
      />

      {/* Actions & Likes */}
      <InstagramBar likes={post.likes} onLike={() => {}} />

      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-sm leading-relaxed text-text">
          <span className="font-bold mr-1.5">{celebrity.name}</span>
          {post.caption}
        </p>
        {post.comments > 0 && (
          <button
            className="text-[13px] mt-1 text-text-secondary hover:text-text transition-colors"
            onClick={() => requireAuth()}
          >
            댓글 {post.comments.toLocaleString()}개 모두 보기
          </button>
        )}
        <p className="text-[10px] mt-1 uppercase tracking-wide text-text-muted">
          {new Date(post.createdAt).toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick Comment Input */}
      <div className="px-3 pb-3 flex items-center gap-2.5 border-t border-border-light pt-2">
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 bg-bg border border-border-light flex items-center justify-center overflow-hidden"
        >
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        </div>
        <input
          type="text"
          placeholder="댓글 달기..."
          className="flex-1 text-[13px] outline-none bg-transparent text-text placeholder:text-text-muted"
          onClick={() => requireAuth()}
        />
      </div>
    </article>
  );
}
