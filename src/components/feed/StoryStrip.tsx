"use client";

import { useRouter } from "next/navigation";
import type { AppEvent, Celebrity } from "@/types";

interface StoryStripProps {
  celebrities: Celebrity[];
  activeCelebId: string;
  onSelect: (id: string) => void;
  events?: AppEvent[];
}

export default function StoryStrip({
  celebrities,
  activeCelebId,
  onSelect,
  events = [],
}: StoryStripProps) {
  const router = useRouter();
  return (
    <div className="bg-surface overflow-x-auto hide-scrollbar px-3 py-3 border-b border-border-light">
      <div className="flex gap-4">
        
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => router.push(`/event/${event.id}`)}
            aria-label={`${event.title} 이벤트 페이지로 이동`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <div className="w-[66px] h-[66px] rounded-full p-[2px] transition-transform active:scale-95 event-story-gradient relative">
              <div className="w-full h-full rounded-full bg-surface p-[2.5px]">
                {event.thumbnail ? (
                  <img
                    src={event.thumbnail}
                    alt={event.title}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-emerald-600 to-emerald-800">
                    EVENT
                  </div>
                )}
              </div>
              {/* EVENT 배지 — 셀럽 스토리와 시각적으로 구분 (그린 톤) */}
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-[#1aaf57] px-1.5 py-[1px] text-[8px] font-bold text-white tracking-wider pointer-events-none">
                EVENT
              </span>
            </div>
            <span className="text-[11px] max-w-[66px] truncate text-center text-text-secondary">
              {event.title}
            </span>
          </button>
        ))}

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
