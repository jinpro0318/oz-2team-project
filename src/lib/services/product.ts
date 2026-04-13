import { getDocuments, getDocument, where, updateDocument } from "@/lib/firestore";
import type { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  return getDocuments<Product>("products");
}

export async function getVisibleProducts(): Promise<Product[]> {
  return getDocuments<Product>("products", [where("isVisible", "==", true)]);
}

export async function getProduct(id: string): Promise<Product | null> {
  return getDocument<Product>("products", id);
}

export async function getProductsByCelebrity(celebrityId: string): Promise<Product[]> {
  return getDocuments<Product>("products", [where("celebrityId", "==", celebrityId)]);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  return updateDocument("products", id, data);
}
