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
      status: "payment_complete",
      label: "결제 완료",
      date: now,
      description: "결제가 정상 처리되었습니다",
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
    status: "payment_complete" as OrderStatus,
    updatedAt: now,
    timeline,
  };

  const id = await createDocument("orders", orderData);
  return { id, ...orderData, createdAt: now } as Order;
}

export async function getOrders(userId: string): Promise<Order[]> {
  return getDocuments<Order>("orders", [
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  ]);
}

export async function getAllOrders(): Promise<Order[]> {
  return getDocuments<Order>("orders", [orderBy("createdAt", "desc")]);
}

export async function getOrder(id: string): Promise<Order | null> {
  return getDocument<Order>("orders", id);
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
