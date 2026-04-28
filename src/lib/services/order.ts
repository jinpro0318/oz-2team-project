import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  where,
  orderBy,
} from "@/lib/firestore";
import type { Order, OrderStatus, OrderItem, Address, OrderTimeline } from "@/types";

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  totalAmount: number;
  shippingFee: number;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const now = new Date().toISOString();
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const timeline: OrderTimeline[] = [
    {
      status: "payment_pending",
      label: "결제 대기",
      date: now,
      description: "결제 진행 중입니다",
    },
  ];

  const orderData = {
    orderNumber,
    userId: input.userId,
    items: input.items,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    totalAmount: input.totalAmount,
    shippingFee: input.shippingFee,
    status: "payment_pending" as OrderStatus,
    updatedAt: now,
    timeline,
  };

  const id = await createDocument("orders", orderData);
  return { id, ...orderData, createdAt: now } as Order;
}

export async function getOrders(userId: string): Promise<Order[]> {
  const docs = await getDocuments<Order>("orders", [
    where("userId", "==", userId),
  ]);
  // Sort in memory to avoid needing a composite index for (userId + createdAt)
  return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllOrders(): Promise<Order[]> {
  const docs = await getDocuments<Order>("orders");
  return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrder(id: string): Promise<Order | null> {
  return getDocument<Order>("orders", id);
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const docs = await getDocuments<Order>("orders", [where("orderNumber", "==", orderNumber)]);
  return docs[0] || null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  timelineEntry?: OrderTimeline
): Promise<void> {
  const order = await getOrder(id);
  if (!order) return;

  const timeline = [...(order.timeline || [])];
  if (timelineEntry) timeline.push(timelineEntry);

  await updateDocument("orders", id, { status, timeline });
}
