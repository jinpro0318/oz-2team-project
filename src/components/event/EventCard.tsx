"use client";

import Link from "next/link";
import type { AppEvent } from "@/types";

interface EventCardProps {
  event: AppEvent;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(s)} ~ ${fmt(e)}`;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/event/${event.id}`}
      className="flex-shrink-0 relative w-[220px] h-[130px] rounded-xl overflow-hidden block"
    >
      {event.thumbnail ? (
        <img
          src={event.thumbnail}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
      )}
      <div
        className="absolute inset-0 flex flex-col justify-end p-3"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 55%)",
        }}
      >
        <p className="text-white text-[13px] font-bold leading-tight line-clamp-2">
          {event.title}
        </p>
        <p className="text-white/70 text-[10px] mt-0.5">
          {formatDateRange(event.startAt, event.endAt)}
        </p>
      </div>
    </Link>
  );
}
