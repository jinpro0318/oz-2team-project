import { getDocuments, getDocument } from "@/lib/firestore";
import type { Celebrity } from "@/types";

export async function getCelebrities(): Promise<Celebrity[]> {
  return getDocuments<Celebrity>("celebrities");
}

export async function getCelebrity(id: string): Promise<Celebrity | null> {
  return getDocument<Celebrity>("celebrities", id);
}
