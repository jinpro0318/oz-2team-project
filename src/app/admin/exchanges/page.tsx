import { adminDb } from "@/lib/firebase-admin";
import ExchangesClientContainer from "./ExchangesClientContainer";
import type { Exchange, Order, Product } from "@/types";

export const dynamic = "force-dynamic";

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

      initialExchanges = exchangesSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        } as Exchange;
      });

      // 2. 관련 주문 조회 (선택 사항 - 여기선 전체 최근 주문을 가져오거나 캐싱)
      const ordersSnap = await adminDb
        .collection("orders")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
        
      initialOrders = ordersSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        } as Order;
      });

      // 3. 관련 상품 조회
      const productsSnap = await adminDb.collection("products").get();
      initialProducts = productsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        } as Product;
      });
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
