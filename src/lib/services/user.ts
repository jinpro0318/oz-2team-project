import { getDocument, updateDocument } from "@/lib/firestore";

export async function updateUserLastChecked(
  userId: string,
  field: "lastCheckedOrders" | "lastCheckedWishlist"
): Promise<void> {
  await updateDocument("users", userId, {
    [field]: new Date().toISOString(),
  });
}

/**
 * 사용자의 일반 프로필 정보나 보안 설정 등을 업데이트합니다.
 */
export async function updateUserProfile(userId: string, data: Record<string, any>): Promise<void> {
  await updateDocument("users", userId, data);
}

/**
 * 사용자의 포인트를 추가 적립합니다.
 */
export async function addUserPoints(userId: string, pointsToAdd: number): Promise<number> {
  const user = await getDocument<{ points?: number }>("users", userId);
  const currentPoints = user?.points || 0;
  const newPoints = currentPoints + pointsToAdd;
  
  await updateDocument("users", userId, {
    points: newPoints
  });
  
  return newPoints;
}

/**
 * 사용자의 현재 포인트를 조회합니다.
 */
export async function getUserPoints(userId: string): Promise<number> {
  const user = await getDocument<{ points?: number }>("users", userId);
  return user?.points || 0;
}
