import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table using Firebase Auth UID as the unique identifier.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define the authoritative 'products' catalog table with integer IDR prices.
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  category: text('category').notNull(),
  unitPrice: integer('unit_price').notNull(),
  currency: text('currency').notNull().default('IDR'),
  available: boolean('available').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define the 'orders' table storing persistent order records with integer IDR totals.
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  payloadFingerprint: text('payload_fingerprint').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  googleMapsUrl: text('google_maps_url').notNull(),
  notes: text('notes').notNull().default(''),
  totalQuantity: integer('total_quantity').notNull(),
  orderSubtotal: integer('order_subtotal').notNull(),
  currency: text('currency').notNull().default('IDR'),
  deliveryFeeStatus: text('delivery_fee_status').notNull().default('unconfirmed_whatsapp'),
  deliveryFee: integer('delivery_fee'),
  provisionalTotal: integer('provisional_total').notNull(),
  status: text('status').notNull().default('pending_whatsapp'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define the 'order_items' table storing immutable product and price snapshots per order line.
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.orderId, { onDelete: 'cascade' })
    .notNull(),
  productId: text('product_id').notNull(),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  lineSubtotal: integer('line_subtotal').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.orderId],
  }),
}));
