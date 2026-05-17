import { adminDb } from "@/lib/firebase-admin";
import ExchangesClientContainer from "./ExchangesClientContainer";
import type { Exchange, Order, Product } from "@/types";

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

export default async function AdminExchangesPage() {
  let initialExchanges: Exchange[] = [];
  let initialOrders: Order[] = [];
  let initialProducts: Product[] = [];

  try {
    if (adminDb) {
      // 1. 교환 내역 조회
      const exchangesSnap = await adminDb
        .collection("exchanges")
        .orderBy("createdAt", "desc")
        .get();

      const rawExchanges = exchangesSnap.docs.map((d) => {
        return {
          id: d.id,
          ...d.data(),
        };
      });
      initialExchanges = serializeFirestoreData(rawExchanges) as Exchange[];

      // 2. 관련 주문 조회
      const ordersSnap = await adminDb
        .collection("orders")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
        
      const rawOrders = ordersSnap.docs.map((d) => {
        return {
          id: d.id,
          ...d.data(),
        };
      });
      initialOrders = serializeFirestoreData(rawOrders) as Order[];

      // 3. 관련 상품 조회
      const productsSnap = await adminDb.collection("products").get();
      const rawProducts = productsSnap.docs.map((d) => {
        return {
          id: d.id,
          ...d.data(),
        };
      });
      initialProducts = serializeFirestoreData(rawProducts) as Product[];
    }
  } catch (err) {
    console.error("[RSC] Failed to fetch initial data for exchanges on server:", err);
  }

  return (
    <ExchangesClientContainer
      initialExchanges={initialExchanges}
      initialOrders={initialOrders}
      initialProducts={initialProducts}
    />
  );
}
