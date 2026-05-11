import { getDocuments, getDocument } from "@/lib/firestore";
import type { AppEvent } from "@/types";

export async function getActiveEvents(): Promise<AppEvent[]> {
  const all = await getDocuments<AppEvent>("events");
  const now = new Date().toISOString();
  return all.filter(
    (e) =>
      e.isActive &&
      (!e.startDate || e.startDate <= now) &&
      (!e.endDate || e.endDate >= now)
  );
}

export async function getEvent(id: string): Promise<AppEvent | null> {
  return getDocument<AppEvent>("events", id);
}
