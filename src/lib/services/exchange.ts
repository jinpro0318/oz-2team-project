import { getDocuments, createDocument, where } from "@/lib/firestore";
import type { Exchange, ExchangeType } from "@/types";

export interface CreateExchangeInput {
  orderId: string;
  orderItemIndex: number;
  type: ExchangeType;
  reason: string;
  reasonDetail?: string;
  refundMethod?: string;
  refundAmount?: number;
}

export async function createExchange(input: CreateExchangeInput): Promise<Exchange> {
  const prefix = input.type === "exchange" ? "EX" : "RT";
  const ticketNumber = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

  const data = {
    ...input,
    status: "requested" as const,
    ticketNumber,
  };

  const id = await createDocument("exchanges", data);
  return { id, ...data, createdAt: new Date().toISOString() } as Exchange;
}

export async function getExchangesByOrder(orderId: string): Promise<Exchange[]> {
  return getDocuments<Exchange>("exchanges", [where("orderId", "==", orderId)]);
}

export async function getAllExchanges(): Promise<Exchange[]> {
  return getDocuments<Exchange>("exchanges");
}

export async function updateExchangeStatus(
  id: string,
  status: "requested" | "processing" | "completed"
): Promise<void> {
  const { updateDocument } = await import("@/lib/firestore");
  return updateDocument("exchanges", id, { status });
}

