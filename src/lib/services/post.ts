import { getDocuments, where, updateDocument, createDocument, deleteDocument } from "@/lib/firestore"; // [효진] deleteDocument 추가
import type { Post, Hotspot } from "@/types";

// 기존: 전체 포스트 조회
export async function getPosts(): Promise<Post[]> {
  return getDocuments<Post>("posts");
}

// 기존: 특정 셀럽의 포스트 목록 조회
export async function getPostsByCelebrity(celebrityId: string): Promise<Post[]> {
  return getDocuments<Post>("posts", [where("celebrityId", "==", celebrityId)]);
}

// [효진] 포스트 생성 (이미지 업로드 대응)
export async function createPost(data: Omit<Post, "id">): Promise<string> {
  return createDocument("posts", data);
}

// [효진] 포스트의 핫스팟 배열 업데이트 (K4 셀럽 관리 핫스팟 편집용)
export async function updatePostHotspots(postId: string, hotspots: Hotspot[]): Promise<void> {
  return updateDocument("posts", postId, { hotspots }); // top, left % 좌표 포함 배열 저장
}

// [효진] 포스트 삭제 (착장 이미지 제거용)
export async function deletePost(postId: string): Promise<void> {
  return deleteDocument("posts", postId);
}
