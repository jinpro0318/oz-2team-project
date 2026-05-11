"use client";

import { useEvents } from "@/hooks/useEvents";
import EventCard from "./EventCard";

export default function EventBanner() {
  const { data: events = [], isLoading } = useEvents();

  if (isLoading || events.length === 0) return null;

  return (
    <section className="bg-surface border-b border-border-light py-3">
      <div className="flex items-center justify-between px-3 mb-2.5">
        <h2 className="text-[13px] font-bold text-text">진행 중인 이벤트</h2>
        <span className="text-[11px] text-text-muted">{events.length}개</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-3 pb-0.5 no-scrollbar">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
