import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  orderBy,
} from "@/lib/firestore";
import type { AppEvent, EventFormData } from "@/types";

export async function getAllEvents(): Promise<AppEvent[]> {
  return getDocuments<AppEvent>("events", [orderBy("priority", "desc")]);
}

// 진행 중(노출 + 기간 매칭) 이벤트만 조회 — 메인/배너용
export async function getActiveEvents(): Promise<AppEvent[]> {
  const all = await getAllEvents();
  const now = new Date().toISOString();
  return all.filter(
    (e) =>
      e.isActive &&
      (!e.startAt || e.startAt <= now) &&
      (!e.endAt || e.endAt >= now)
  );
}

// 단일 이벤트 조회 — 상세 페이지/수정 prefill 등에서 사용
export async function getEvent(id: string): Promise<AppEvent | null> {
  return getDocument<AppEvent>("events", id);
}

export async function createEvent(data: EventFormData): Promise<string> {
  return createDocument("events", data);
}

export async function updateEvent(
  id: string,
  data: Partial<EventFormData>
): Promise<void> {
  return updateDocument("events", id, data);
}

export async function deleteEvent(id: string): Promise<void> {
  return deleteDocument("events", id);
}
