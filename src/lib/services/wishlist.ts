import {
  getSubDocuments,
  setSubDocument,
  deleteSubDocument,
} from "@/lib/firestore";
import type { WishlistItem, Product } from "@/types";

const PARENT = "users";
const SUB = "wishlist";

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  return getSubDocuments<WishlistItem>(PARENT, userId, SUB);
}

export async function addWishlistItem(userId: string, product: Product): Promise<void> {
  const item: WishlistItem = {
    id: product.id,
    productId: product.id,
    product,
    addedAt: new Date().toISOString(),
  };
  await setSubDocument(PARENT, userId, SUB, product.id, item);
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  await deleteSubDocument(PARENT, userId, SUB, productId);
}
