/**
 * Seed the products database from the existing in-memory product catalog.
 */

import type Database from "better-sqlite3";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  in_stock: boolean;
}

/**
 * The same product data from src/data/products.ts, duplicated here
 * so the setup script doesn't need to import from the main server code
 * (which may have side effects on import).
 */
const PRODUCTS: Product[] = [
  { id: "scarf_cashmere_001", name: "Cashmere Wrap Scarf", price: 189.0, category: "accessories", description: "Ultra-soft cashmere wrap in a neutral palette. Perfect for layering.", rating: 4.6, reviews: 128, in_stock: true },
  { id: "jacket_denim_001", name: "Blue Denim Jacket (Limited Edition)", price: 79.99, category: "outerwear", description: "Classic denim jacket with a modern fit. Limited run of 500.", rating: 4.4, reviews: 203, in_stock: true },
  { id: "bag_weekender_001", name: "Leather Weekender Bag", price: 425.0, category: "bags", description: "Full-grain leather weekender with brass hardware. Built to last.", rating: 4.9, reviews: 67, in_stock: true },
  { id: "bag_city_001", name: "City Tote", price: 199.0, category: "bags", description: "Structured leather tote for everyday carry. Laptop-friendly.", rating: 4.5, reviews: 156, in_stock: true },
  { id: "bag_satchel_001", name: "Compact Travel Satchel", price: 149.0, category: "bags", description: "Lightweight crossbody satchel in vegetable-tanned leather.", rating: 4.8, reviews: 72, in_stock: true },
  { id: "bag_heritage_001", name: "Heritage Duffle", price: 269.0, category: "bags", description: "Canvas and leather duffle bag. Classic design meets modern durability.", rating: 4.7, reviews: 93, in_stock: true },
  { id: "watch_meridian_001", name: "Meridian Automatic Watch", price: 2400.0, category: "watches", description: "Swiss automatic movement with sapphire crystal. 42mm case.", rating: 4.9, reviews: 31, in_stock: true },
  { id: "blazer_silk_001", name: "Silk Blend Blazer", price: 299.0, category: "outerwear", description: "Unstructured blazer in silk-wool blend. Effortlessly elegant.", rating: 4.3, reviews: 88, in_stock: true },
  { id: "sneakers_canvas_001", name: "Canvas Sneakers", price: 89.0, category: "footwear", description: "Minimalist canvas sneakers with rubber sole. White and navy.", rating: 4.2, reviews: 312, in_stock: true },
  { id: "shirt_linen_001", name: "Linen Shirt Set", price: 145.0, category: "tops", description: "Relaxed-fit linen shirt. Pre-washed for softness.", rating: 4.6, reviews: 95, in_stock: true },
];

const DEFAULT_INVENTORY_QTY = 100;

/**
 * Seed products and inventory into the database.
 * Skips products that already exist (idempotent).
 */
export function seedProducts(db: Database.Database): number {
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, description, price, category, rating, reviews, in_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInventory = db.prepare(`
    INSERT OR IGNORE INTO inventory (product_id, quantity)
    VALUES (?, ?)
  `);

  let inserted = 0;

  const seedAll = db.transaction(() => {
    for (const p of PRODUCTS) {
      const result = insertProduct.run(
        p.id, p.name, p.description, p.price, p.category, p.rating, p.reviews, p.in_stock ? 1 : 0
      );
      if (result.changes > 0) {
        inserted++;
        insertInventory.run(p.id, DEFAULT_INVENTORY_QTY);
      }
    }
  });

  seedAll();
  return inserted;
}

/**
 * Get current counts from the database for status reporting.
 */
export function getDbStats(db: Database.Database): { products: number; inventoryItems: number } {
  const products = (db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }).count;
  const inventoryItems = (db.prepare("SELECT COUNT(*) as count FROM inventory").get() as { count: number }).count;
  return { products, inventoryItems };
}
