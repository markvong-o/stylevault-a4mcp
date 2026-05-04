import { PRODUCTS } from "./products";

/**
 * In-memory shopping cart store, keyed by user email (extracted from the
 * authenticated JWT). State is lost on Vercel cold-start; that is a known
 * trade-off consistent with the existing wishlist and preference stores.
 *
 * Carts feed the checkout_cart MCP tool and the /api/ucp/v1/cart REST
 * routes. Any order creation from a cart runs through checkout_cart and,
 * for totals above $100, through the CIBA step-up path in ciba.ts.
 */

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  user_email: string;
  items: CartItem[];
  total: number;
  updated_at: string;
}

const carts = new Map<string, Cart>();

export type CartMutationError =
  | { error: "not_found"; message: string }
  | { error: "out_of_stock"; message: string }
  | { error: "invalid_quantity"; message: string }
  | { error: "not_in_cart"; message: string };

function computeTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function emptyCart(userEmail: string): Cart {
  return {
    user_email: userEmail,
    items: [],
    total: 0,
    updated_at: new Date().toISOString(),
  };
}

export function getCart(userEmail: string): Cart {
  return carts.get(userEmail) ?? emptyCart(userEmail);
}

export function addToCart(
  userEmail: string,
  productId: string,
  quantity: number
): Cart | CartMutationError {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "invalid_quantity", message: "Quantity must be a positive integer." };
  }

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return { error: "not_found", message: `Product '${productId}' not found.` };
  }
  if (!product.in_stock) {
    return { error: "out_of_stock", message: `'${product.name}' is currently out of stock.` };
  }

  const cart = carts.get(userEmail) ?? emptyCart(userEmail);
  const existing = cart.items.find((i) => i.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    });
  }

  cart.total = computeTotal(cart.items);
  cart.updated_at = new Date().toISOString();
  carts.set(userEmail, cart);
  return cart;
}

export function updateCartItem(
  userEmail: string,
  productId: string,
  quantity: number
): Cart | CartMutationError {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: "invalid_quantity", message: "Quantity must be a non-negative integer." };
  }

  const cart = carts.get(userEmail) ?? emptyCart(userEmail);
  const existing = cart.items.find((i) => i.product_id === productId);
  if (!existing) {
    return { error: "not_in_cart", message: `Product '${productId}' is not in your cart.` };
  }

  if (quantity === 0) {
    cart.items = cart.items.filter((i) => i.product_id !== productId);
  } else {
    existing.quantity = quantity;
  }

  cart.total = computeTotal(cart.items);
  cart.updated_at = new Date().toISOString();
  carts.set(userEmail, cart);
  return cart;
}

export function removeFromCart(
  userEmail: string,
  productId: string
): Cart | CartMutationError {
  const cart = carts.get(userEmail) ?? emptyCart(userEmail);
  const existing = cart.items.find((i) => i.product_id === productId);
  if (!existing) {
    return { error: "not_in_cart", message: `Product '${productId}' is not in your cart.` };
  }

  cart.items = cart.items.filter((i) => i.product_id !== productId);
  cart.total = computeTotal(cart.items);
  cart.updated_at = new Date().toISOString();
  carts.set(userEmail, cart);
  return cart;
}

export function clearCart(userEmail: string): Cart {
  const cleared = emptyCart(userEmail);
  carts.set(userEmail, cleared);
  return cleared;
}
