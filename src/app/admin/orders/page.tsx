import { adminDb } from "@/lib/firebase-admin";
import OrdersClientContainer from "./OrdersClientContainer";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

// Firestore Timestamp 등 Non-Plain Object를 재귀적으로 안전하게 직렬화하는 헬퍼 함수
function serializeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Firestore Timestamp 객체 감지 및 ISO 문자열 변환
  if (typeof (data as any).toDate === "function") {
    return (data as any).toDate().toISOString() as any;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeFirestoreData(item)) as any;
  }

  if (typeof data === "object") {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeFirestoreData(data[key]);
      }
    }
    return serialized as T;
  }

  return data;
}

export default async function AdminOrdersPage() {
  let initialOrders: Order[] = [];

  try {
    if (adminDb) {
      const snap = await adminDb
        .collection("orders")
        .orderBy("createdAt", "desc")
        .limit(40)
        .get();

      const rawOrders = snap.docs.map((d) => {
        return {
          id: d.id,
          ...d.data(),
        };
      });

      // 전체 데이터를 재귀적으로 직렬화하여 Timestamp 에러 원천 차단
      initialOrders = serializeFirestoreData(rawOrders) as Order[];
    }
  } catch (err) {
    console.error("[RSC] Failed to fetch initial orders on server:", err);
  }

  return <OrdersClientContainer initialOrders={initialOrders} />;
}
