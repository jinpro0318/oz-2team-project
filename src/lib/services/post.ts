import { getDocuments, where } from "@/lib/firestore";
import type { Post } from "@/types";

export async function getPosts(): Promise<Post[]> {
  return getDocuments<Post>("posts");
}

export async function getPostsByCelebrity(celebrityId: string): Promise<Post[]> {
  return getDocuments<Post>("posts", [where("celebrityId", "==", celebrityId)]);
}
