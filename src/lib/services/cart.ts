import {
  getSubDocuments,
  setSubDocument,
  deleteSubDocument,
  clearSubCollection,
} from "@/lib/firestore";
import type { CartItem, Product } from "@/types";

const PARENT = "users";
const SUB = "cart";

export async function getCartItems(userId: string): Promise<CartItem[]> {
  return getSubDocuments<CartItem>(PARENT, userId, SUB);
}

export async function addCartItem(
  userId: string,
  product: Product,
  color: string,
  size: string,
  quantity: number
): Promise<void> {
  const itemId = `${product.id}_${color}_${size}`;
  const existing = await getSubDocuments<CartItem>(PARENT, userId, SUB);
  const found = existing.find((i) => i.id === itemId);

  const item: CartItem = {
    id: itemId,
    productId: product.id,
    product,
    color,
    size,
    quantity: found ? found.quantity + quantity : quantity,
  };
  await setSubDocument(PARENT, userId, SUB, itemId, item);
}

export async function updateCartItemQty(
  userId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    await deleteSubDocument(PARENT, userId, SUB, itemId);
  } else {
    await setSubDocument(PARENT, userId, SUB, itemId, { quantity });
  }
}

export async function removeCartItem(userId: string, itemId: string): Promise<void> {
  await deleteSubDocument(PARENT, userId, SUB, itemId);
}

export async function clearCart(userId: string): Promise<void> {
  await clearSubCollection(PARENT, userId, SUB);
}
