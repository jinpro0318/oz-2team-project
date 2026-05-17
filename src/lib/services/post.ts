import { getDocuments, where, updateDocument, createDocument, deleteDocument } from "@/lib/firestore";
import type { Post, Hotspot } from "@/types";

// 기존: 전체 포스트 조회
export async function getPosts(): Promise<Post[]> {
  return getDocuments<Post>("posts");
}

// 기존: 특정 셀럽의 포스트 목록 조회
export async function getPostsByCelebrity(celebrityId: string): Promise<Post[]> {
  return getDocuments<Post>("posts", [where("celebrityId", "==", celebrityId)]);
}

export async function createPost(data: Omit<Post, "id">): Promise<string> {
  return createDocument("posts", data);
}

export async function updatePostHotspots(postId: string, hotspots: Hotspot[]): Promise<void> {
  return updateDocument("posts", postId, { hotspots }); // top, left % 좌표 포함 배열 저장
}

export async function updatePost(postId: string, data: Partial<Omit<Post, "id">>): Promise<void> {
  return updateDocument("posts", postId, data);
}

export async function deletePost(postId: string): Promise<void> {
  return deleteDocument("posts", postId);
}

