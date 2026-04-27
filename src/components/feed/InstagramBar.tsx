"use client";

import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";

interface InstagramBarProps {
  likes: number;
  onLike?: () => void;
}

export function InstagramBar({ likes, onLike }: InstagramBarProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.();
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3.5">
          <button onClick={handleLike} className="hover:opacity-60 transition-opacity">
            <Heart
              className="w-[23px] h-[23px]"
              fill={isLiked ? "var(--color-red)" : "none"}
              stroke={isLiked ? "var(--color-red)" : "currentColor"}
              strokeWidth={1.8}
            />
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <MessageCircle className="w-[23px] h-[23px]" strokeWidth={1.8} />
          </button>
          <button className="hover:opacity-60 transition-opacity">
            <Send className="w-[23px] h-[23px]" strokeWidth={1.8} />
          </button>
        </div>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="hover:opacity-60 transition-opacity"
        >
          <Bookmark
            className="w-[23px] h-[23px]"
            fill={isSaved ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        </button>
      </div>
      <div className="text-[13px] font-bold text-text">
        좋아요 {mounted ? (isLiked ? likes + 1 : likes).toLocaleString() : (isLiked ? likes + 1 : likes)}개
      </div>
    </div>
  );
}
