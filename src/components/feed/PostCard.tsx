"use client";

import { HeartOutlined, HeartFilled, MessageOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import HotspotImage from "./HotspotImage";
import type { Post, Celebrity } from "@/types";
import { useRequireAuth } from "@/hooks/useAuth";

interface PostCardProps {
  post: Post;
  celebrity: Celebrity;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function PostCard({ post, celebrity }: PostCardProps) {
  const { requireAuth } = useRequireAuth();

  return (
    <article className="border-b border-border bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <div className="instagram-gradient rounded-full p-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 text-[10px] font-bold text-white">
            {celebrity.name[0]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold">{celebrity.name}</p>
          <p className="text-[11px] text-text-secondary">{celebrity.handle}</p>
        </div>
      </div>

      {/* Image with Hotspots */}
      <HotspotImage
        imageUrl={post.imageUrl}
        hotspots={post.hotspots}
        gradient={celebrity.gradient}
        celebName={celebrity.name}
      />

      {/* Actions */}
      <div className="flex items-center gap-3.5 px-3 pt-2 pb-1">
        <HeartOutlined
          className="cursor-pointer text-xl"
          onClick={() => requireAuth()}
        />
        <MessageOutlined className="cursor-pointer text-xl" />
        <ShoppingCartOutlined className="ml-auto cursor-pointer text-xl" />
      </div>

      {/* Likes */}
      <p className="px-3 pb-1 text-[13px] font-bold">
        좋아요 {formatNumber(post.likes)}개
      </p>

      {/* Caption */}
      <p className="px-3 pb-1.5 text-sm leading-relaxed">
        <span className="font-bold">{celebrity.name}</span>{" "}
        {post.caption}
      </p>

      {/* Time */}
      <p className="px-3 pb-2 text-[10px] uppercase tracking-wide text-text-muted">
        {new Date(post.createdAt).toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
        })}
      </p>
    </article>
  );
}
