import { adminDb } from "@/lib/firebase-admin";
import OrdersClientContainer from "./OrdersClientContainer";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  let initialOrders: Order[] = [];

  try {
    if (adminDb) {
      const snap = await adminDb
        .collection("orders")
        .orderBy("createdAt", "desc")
        .limit(40)
        .get();

      initialOrders = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        } as Order;
      });
    }
  } catch (err) {
    console.error("[RSC] Failed to fetch initial orders on server:", err);
  }

  return <OrdersClientContainer initialOrders={initialOrders} />;
}
