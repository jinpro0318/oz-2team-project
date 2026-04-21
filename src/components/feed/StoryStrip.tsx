"use client";

import type { Celebrity } from "@/types";

interface StoryStripProps {
  celebrities: Celebrity[];
  activeCelebId: string;
  onSelect: (id: string) => void;
}

export default function StoryStrip({
  celebrities,
  activeCelebId,
  onSelect,
}: StoryStripProps) {
  return (
    <div className="bg-surface overflow-x-auto hide-scrollbar px-3 py-3 border-b border-border-light">
      <div className="flex gap-4">
        {/* Current User Story Placeholder */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-[66px] h-[66px] rounded-full p-[0.5px] bg-border-light flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-surface p-[2.5px]">
              <div className="w-full h-full rounded-full bg-bg flex items-center justify-center relative">
                <span className="text-xl font-bold text-text-muted">+</span>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-surface flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-white rounded-full" />
                  <div className="w-0.5 h-2 bg-white rounded-full absolute" />
                </div>
              </div>
            </div>
          </div>
          <span className="text-[11px] text-text-secondary">내 스토리</span>
        </div>

        {/* Celebrities Stories */}
        {celebrities.map((celeb) => (
          <button
            key={celeb.id}
            onClick={() => onSelect(celeb.id)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div
              className={`w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 ${
                activeCelebId === celeb.id
                  ? "instagram-gradient"
                  : "bg-border-light"
              }`}
            >
              <div className="w-full h-full rounded-full bg-surface p-[2.5px]">
                {celeb.avatarUrl ? (
                  <img
                    src={celeb.avatarUrl}
                    alt={celeb.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: celeb.gradient }}
                  >
                    {celeb.name[0]}
                  </div>
                )}
              </div>
            </div>
            <span
              className={`text-[11px] max-w-[66px] truncate text-center ${
                activeCelebId === celeb.id ? "font-bold text-text" : "text-text-secondary"
              }`}
            >
              {celeb.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
