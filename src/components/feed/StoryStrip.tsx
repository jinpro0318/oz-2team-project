"use client";

import type { Celebrity } from "@/types";

interface StoryStripProps {
  celebrities: Celebrity[];
  activeCelebId: string;
  onSelect: (id: string) => void;
}

export default function StoryStrip({ celebrities, activeCelebId, onSelect }: StoryStripProps) {
  return (
    <div className="hide-scrollbar flex gap-3.5 overflow-x-auto px-3 py-2.5">
      {celebrities.map((celeb) => {
        const isActive = celeb.id === activeCelebId;
        return (
          <button
            key={celeb.id}
            className="flex shrink-0 flex-col items-center gap-1.5 bg-transparent border-none cursor-pointer"
            onClick={() => onSelect(celeb.id)}
          >
            <div className={`rounded-full p-0.5 ${isActive ? "instagram-gradient" : "bg-border"}`}>
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 text-sm font-bold text-white">
                {celeb.name[0]}
              </div>
            </div>
            <span className={`max-w-[64px] truncate text-[11px] ${isActive ? "font-bold text-text" : "text-text-secondary"}`}>
              {celeb.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
