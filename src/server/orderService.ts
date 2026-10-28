import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { orderItems, orders, products } from '../db/schema.ts';
import { getOrCreateUser } from '../db/users.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import firebaseConfig from '../../firebase-applet-config.json';
import { BASE_PRODUCTS, Product, ProductId } from '../data/products.ts';
import {
  FIELD_LIMITS,
  isValidGoogleMapsUrl,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from '../utils/validation.ts';
import { generateWhatsAppUrl } from '../utils/whatsapp.ts';
import { DEFAULT_ADMIN_EMAILS } from '../config/siteConfig.ts';

export type OrderStatus =
  | 'pending_whatsapp'
  | 'awaiting_admin_confirmation'
  | 'confirmed'
  | 'preparing'
  | 'completed'
  | 'cancelled';

export interface OrderLineItemRecord {
  orderId: string;
  productId: ProductId;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
}

export interface OrderRecord {
  orderId: string;
  idempotencyKey: string;
  payloadHash: string;
  items: OrderLineItemRecord[];
  productIds: ProductId[];
  totalQuantity: number;
  orderSubtotal: number;
  deliveryFee: number | null;
  deliveryFeeStatus: 'unconfirmed_whatsapp' | 'confirmed';
  provisionalTotal: number;
  isFinalTotalKnown: boolean;
  currency: 'IDR';
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  googleMapsUrl: string;
  notes: string;
  status: OrderStatus;
  whatsappUrl: string;
  persistedToDatabase: boolean;
  databaseBackend: 'postgresql' | 'supabase';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  idempotencyKey?: unknown;
  items?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  deliveryAddress?: unknown;
  googleMapsUrl?: unknown;
  notes?: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_whatsapp: ['awaiting_admin_confirmation', 'confirmed', 'cancelled'],
  awaiting_admin_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const VALID_ORDER_STATUSES = new Set<OrderStatus>([
  'pending_whatsapp',
  'awaiting_admin_confirmation',
  'confirmed',
  'preparing',
  'completed',
  'cancelled',
]);

let cachedSupabaseAdmin: SupabaseClient | null = null;

function isPlaceholderValue(val: string | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  const upper = trimmed.toUpperCase();
  return (
    upper.includes('YOUR_') ||
    upper.includes('PLACEHOLDER') ||
    upper.includes('EXAMPLE') ||
    upper === 'MY_SUPABASE_URL' ||
    upper === 'MY_SUPABASE_SECRET_KEY'
  );
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseSecretKey = (
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (
    !supabaseUrl ||
    !supabaseSecretKey ||
    isPlaceholderValue(supabaseUrl) ||
    isPlaceholderValue(supabaseSecretKey)
  ) {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedSupabaseAdmin;
}

export function isPostgresPoolConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST &&
      process.env.SQL_USER &&
      process.env.SQL_PASSWORD &&
      process.env.SQL_DB_NAME
  );
}

export function getDatabaseDiagnostics(): {
  activeBackend: 'postgresql' | 'supabase' | 'unconfigured';
  supabaseConfigured: boolean;
  postgresPoolConfigured: boolean;
} {
  const supabaseConfigured = Boolean(getSupabaseServerClient());
  const postgresPoolConfigured = isPostgresPoolConfigured();
  const activeBackend = supabaseConfigured
    ? 'supabase'
    : postgresPoolConfigured
      ? 'postgresql'
      : 'unconfigured';

  return {
    activeBackend,
    supabaseConfigured,
    postgresPoolConfigured,
  };
}

export async function getAuthoritativeCatalog(): Promise<Product[]> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, short_name, category, unit_price, currency, available');
      if (error) {
        throw new Error('Failed to query products from Supabase', { cause: error });
      }
      if (data && data.length > 0) {
        return BASE_PRODUCTS.map((base) => {
          const row = data.find((r) => r.id === base.id);
          if (!row) return { ...base };
          return {
            ...base,
            name: row.name || base.name,
            shortName: row.short_name || base.shortName,
            defaultPrice: typeof row.unit_price === 'number' ? row.unit_price : base.defaultPrice,
            available: typeof row.available === 'boolean' ? row.available : base.available,
          };
        });
      }
    }

    if (isPostgresPoolConfigured()) {
      const rows = await db.select().from(products);
      if (rows.length > 0) {
        return BASE_PRODUCTS.map((base) => {
          const row = rows.find((r) => r.id === base.id);
          if (!row) return { ...base };
          return {
            ...base,
            name: row.name || base.name,
            shortName: row.shortName || base.shortName,
            defaultPrice: row.unitPrice,
            available: row.available,
          };
        });
      }
    }

    return BASE_PRODUCTS.map((b) => ({ ...b }));
  } catch (error) {
    console.error('Database catalog query failed:', error);
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Gagal memuat katalog produk dari database. Silakan coba beberapa saat lagi.',
      { cause: error }
    );
  }
}

function generateServerOrderId(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += randomChars[bytes[i] % randomChars.length];
  }
  return `ORD-${year}${month}${day}-${suffix}`;
}

function computePayloadHash(normalizedPayload: {
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  googleMapsUrl: string;
  notes: string;
}): string {
  const canonicalJson = JSON.stringify({
    items: [...normalizedPayload.items].sort((a, b) => a.productId.localeCompare(b.productId)),
    customerName: normalizedPayload.customerName,
    customerPhone: normalizedPayload.customerPhone,
    deliveryAddress: normalizedPayload.deliveryAddress,
    googleMapsUrl: normalizedPayload.googleMapsUrl,
    notes: normalizedPayload.notes,
  });
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

function hydrateOrderRecord(
  orderRow: {
    orderId: string;
    idempotencyKey: string;
    payloadFingerprint: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    googleMapsUrl: string;
    notes: string;
    totalQuantity: number;
    orderSubtotal: number;
    currency: string;
    deliveryFeeStatus: string;
    deliveryFee: number | null;
    provisionalTotal: number;
    status: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  itemRows: Array<{
    orderId: string;
    productId: string;
    productNameSnapshot: string;
    unitPrice: number;
    quantity: number;
    lineSubtotal: number;
  }>,
  catalog: Product[],
  databaseBackend: 'postgresql' | 'supabase'
): OrderRecord {
  const items: OrderLineItemRecord[] = itemRows.map((item) => ({
    orderId: item.orderId,
    productId: item.productId as ProductId,
    productName: item.productNameSnapshot,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineSubtotal: item.lineSubtotal,
  }));

  const whatsappUrl = generateWhatsAppUrl({
    orderReference: orderRow.orderId,
    items: items.map((li) => ({
      product:
        catalog.find((p) => p.id === li.productId) ||
        BASE_PRODUCTS.find((p) => p.id === li.productId) ||
        BASE_PRODUCTS[0],
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      subtotal: li.lineSubtotal,
    })),
    totalQuantity: orderRow.totalQuantity,
    orderSubtotal: orderRow.orderSubtotal,
    customerData: {
      fullName: orderRow.customerName,
      whatsappPhone: orderRow.customerPhone,
      deliveryAddress: orderRow.deliveryAddress,
      googleMapsUrl: orderRow.googleMapsUrl,
      notes: orderRow.notes,
    },
  });

  const createdAtIso =
    orderRow.createdAt instanceof Date
      ? orderRow.createdAt.toISOString()
      : new Date(orderRow.createdAt).toISOString();
  const updatedAtIso =
    orderRow.updatedAt instanceof Date
      ? orderRow.updatedAt.toISOString()
      : new Date(orderRow.updatedAt).toISOString();

  return {
    orderId: orderRow.orderId,
    idempotencyKey: orderRow.idempotencyKey,
    payloadHash: orderRow.payloadFingerprint,
    items,
    productIds: items.map((i) => i.productId),
    totalQuantity: orderRow.totalQuantity,
    orderSubtotal: orderRow.orderSubtotal,
    deliveryFee: orderRow.deliveryFee,
    deliveryFeeStatus:
      orderRow.deliveryFeeStatus === 'confirmed' ? 'confirmed' : 'unconfirmed_whatsapp',
    provisionalTotal: orderRow.provisionalTotal,
    isFinalTotalKnown: orderRow.deliveryFeeStatus === 'confirmed' && orderRow.deliveryFee !== null,
    currency: 'IDR',
    customerName: orderRow.customerName,
    customerPhone: orderRow.customerPhone,
    deliveryAddress: orderRow.deliveryAddress,
    googleMapsUrl: orderRow.googleMapsUrl,
    notes: orderRow.notes,
    status: (orderRow.status as OrderStatus) || 'pending_whatsapp',
    whatsappUrl,
    persistedToDatabase: true,
    databaseBackend,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
  };
}

async function fetchOrderByIdempotencyKeyFromDb(
  idempotencyKey: string,
  catalog: Product[]
): Promise<OrderRecord | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (orderErr) {
        throw new Error('Supabase idempotency lookup failed', { cause: orderErr });
      }
      if (!orderData) return null;

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.order_id);
      if (itemsErr) {
        throw new Error('Supabase order_items lookup failed', { cause: itemsErr });
      }

      return hydrateOrderRecord(
        {
          orderId: orderData.order_id,
          idempotencyKey: orderData.idempotency_key,
          payloadFingerprint: orderData.payload_fingerprint,
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          deliveryAddress: orderData.delivery_address,
          googleMapsUrl: orderData.google_maps_url,
          notes: orderData.notes,
          totalQuantity: orderData.total_quantity,
          orderSubtotal: orderData.order_subtotal,
          currency: orderData.currency,
          deliveryFeeStatus: orderData.delivery_fee_status,
          deliveryFee: orderData.delivery_fee,
          provisionalTotal: orderData.provisional_total,
          status: orderData.status,
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
        },
        (itemsData || []).map((row) => ({
          orderId: row.order_id,
          productId: row.product_id,
          productNameSnapshot: row.product_name_snapshot,
          unitPrice: row.unit_price,
          quantity: row.quantity,
          lineSubtotal: row.line_subtotal,
        })),
        catalog,
        'supabase'
      );
    }

    if (isPostgresPoolConfigured()) {
      const existingRows = await db
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, idempotencyKey));
      if (existingRows.length === 0) return null;
      const orderRow = existingRows[0];
      const itemRows = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderRow.orderId));

      return hydrateOrderRecord(orderRow, itemRows, catalog, 'postgresql');
    }

    return null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.warn('Database idempotency lookup skipped/failed, proceeding:', error);
    return null;
  }
}

async function fetchOrderByOrderIdFromDb(
  orderId: string,
  catalog: Product[]
): Promise<OrderRecord | null> {
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (orderErr) {
        throw new Error('Supabase order lookup failed', { cause: orderErr });
      }
      if (!orderData) return null;

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderData.order_id);
      if (itemsErr) {
        throw new Error('Supabase order_items lookup failed', { cause: itemsErr });
      }

      return hydrateOrderRecord(
        {
          orderId: orderData.order_id,
          idempotencyKey: orderData.idempotency_key,
          payloadFingerprint: orderData.payload_fingerprint,
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          deliveryAddress: orderData.delivery_address,
          googleMapsUrl: orderData.google_maps_url,
          notes: orderData.notes,
          totalQuantity: orderData.total_quantity,
          orderSubtotal: orderData.order_subtotal,
          currency: orderData.currency,
          deliveryFeeStatus: orderData.delivery_fee_status,
          deliveryFee: orderData.delivery_fee,
          provisionalTotal: orderData.provisional_total,
          status: orderData.status,
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
        },
        (itemsData || []).map((row) => ({
          orderId: row.order_id,
          productId: row.product_id,
          productNameSnapshot: row.product_name_snapshot,
          unitPrice: row.unit_price,
          quantity: row.quantity,
          lineSubtotal: row.line_subtotal,
        })),
        catalog,
        'supabase'
      );
    }

    if (isPostgresPoolConfigured()) {
      const existingRows = await db.select().from(orders).where(eq(orders.orderId, orderId));
      if (existingRows.length === 0) return null;
      const orderRow = existingRows[0];
      const itemRows = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderRow.orderId));

      return hydrateOrderRecord(orderRow, itemRows, catalog, 'postgresql');
    }

    throw new ApiError(
      503,
      'DATABASE_NOT_CONFIGURED',
      'Database PostgreSQL / Supabase belum dikonfigurasi di server.'
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Database order lookup failed:', error);
    throw new ApiError(503, 'DATABASE_QUERY_FAILED', 'Gagal membaca data pesanan dari database.', {
      cause: error,
    });
  }
}

export async function createAuthoritativeOrder(
  input: CreateOrderInput
): Promise<{ order: OrderRecord; idempotentReplay: boolean }> {
  if (!input || typeof input !== 'object') {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Format data pesanan tidak valid.');
  }

  // 1. Validate idempotencyKey
  const rawIdempotencyKey =
    typeof input.idempotencyKey === 'string' ? input.idempotencyKey.trim() : '';
  if (
    rawIdempotencyKey.length < 8 ||
    rawIdempotencyKey.length > 64 ||
    !/^[a-zA-Z0-9_\-]+$/.test(rawIdempotencyKey)
  ) {
    throw new ApiError(
      400,
      'INVALID_IDEMPOTENCY_KEY',
      'Idempotency key wajib disertakan (8-64 karakter alfanumerik).'
    );
  }

  // 2. Validate items array
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError(400, 'EMPTY_ORDER', 'Keranjang pesanan tidak boleh kosong.');
  }
  if (input.items.length > 2) {
    throw new ApiError(
      400,
      'TOO_MANY_ITEMS',
      'Katalog CHICKCHAU hanya memiliki maksimal 2 jenis produk.'
    );
  }

  const catalog = await getAuthoritativeCatalog();
  const seenProducts = new Set<string>();
  const normalizedItemsInput: Array<{ productId: ProductId; quantity: number }> = [];

  for (const rawItem of input.items) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new ApiError(400, 'INVALID_ITEM', 'Format item pesanan tidak valid.');
    }
    const itemObj = rawItem as Record<string, unknown>;
    const productId = typeof itemObj.productId === 'string' ? itemObj.productId.trim() : '';
    const quantity = itemObj.quantity;

    const catalogProduct = catalog.find((p) => p.id === productId);
    if (!catalogProduct) {
      throw new ApiError(
        400,
        'INVALID_PRODUCT',
        `Produk "${productId || 'unknown'}" tidak terdaftar dalam katalog resmi CHICKCHAU.`
      );
    }

    if (seenProducts.has(catalogProduct.id)) {
      throw new ApiError(
        400,
        'DUPLICATE_PRODUCT_LINE',
        `Produk ${catalogProduct.name} dikirim lebih dari satu baris.`
      );
    }
    seenProducts.add(catalogProduct.id);

    if (!catalogProduct.available) {
      throw new ApiError(
        422,
        'PRODUCT_UNAVAILABLE',
        `Produk ${catalogProduct.name} sedang tidak tersedia.`
      );
    }

    if (
      typeof catalogProduct.defaultPrice !== 'number' ||
      !Number.isInteger(catalogProduct.defaultPrice) ||
      catalogProduct.defaultPrice <= 0
    ) {
      throw new ApiError(
        422,
        'PRICE_UNCONFIGURED',
        `Harga resmi untuk ${catalogProduct.name} belum dikonfigurasi di server.`
      );
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > FIELD_LIMITS.maxItemQuantity
    ) {
      throw new ApiError(
        400,
        'INVALID_QUANTITY',
        `Jumlah porsi untuk ${catalogProduct.name} harus berupa bilangan bulat antara 1 hingga ${FIELD_LIMITS.maxItemQuantity}.`
      );
    }

    normalizedItemsInput.push({
      productId: catalogProduct.id,
      quantity,
    });
  }

  // 3. Validate customer delivery fields
  const customerName =
    typeof input.customerName === 'string' ? input.customerName.trim() : '';
  if (
    customerName.length < FIELD_LIMITS.fullNameMin ||
    customerName.length > FIELD_LIMITS.fullNameMax
  ) {
    throw new ApiError(
      400,
      'INVALID_CUSTOMER_NAME',
      `Nama lengkap wajib diisi (${FIELD_LIMITS.fullNameMin}-${FIELD_LIMITS.fullNameMax} karakter).`
    );
  }

  const rawPhone =
    typeof input.customerPhone === 'string' ? input.customerPhone.trim() : '';
  const customerPhone = normalizePhoneNumber(rawPhone);
  if (!isValidPhoneNumber(customerPhone)) {
    throw new ApiError(
      400,
      'INVALID_CUSTOMER_PHONE',
      'Nomor WhatsApp pelanggan tidak valid (gunakan awalan 08, 628, atau +628).'
    );
  }

  const deliveryAddress =
    typeof input.deliveryAddress === 'string' ? input.deliveryAddress.trim() : '';
  if (
    deliveryAddress.length < FIELD_LIMITS.addressMin ||
    deliveryAddress.length > FIELD_LIMITS.addressMax
  ) {
    throw new ApiError(
      400,
      'INVALID_DELIVERY_ADDRESS',
      `Alamat lengkap pengantaran wajib diisi (${FIELD_LIMITS.addressMin}-${FIELD_LIMITS.addressMax} karakter).`
    );
  }

  const googleMapsUrl =
    typeof input.googleMapsUrl === 'string' ? input.googleMapsUrl.trim() : '';
  if (!isValidGoogleMapsUrl(googleMapsUrl)) {
    throw new ApiError(
      400,
      'INVALID_GOOGLE_MAPS_URL',
      'Tautan Google Maps harus berupa URL HTTPS resmi Google Maps.'
    );
  }

  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notes.length > FIELD_LIMITS.notesMax) {
    throw new ApiError(
      400,
      'INVALID_NOTES',
      `Catatan tambahan maksimal ${FIELD_LIMITS.notesMax} karakter.`
    );
  }

  // 4. Check idempotency in PostgreSQL / Supabase
  const payloadHash = computePayloadHash({
    items: normalizedItemsInput,
    customerName,
    customerPhone,
    deliveryAddress,
    googleMapsUrl,
    notes,
  });

  const existingOrder = await fetchOrderByIdempotencyKeyFromDb(rawIdempotencyKey, catalog);
  if (existingOrder) {
    if (existingOrder.payloadHash !== payloadHash) {
      throw new ApiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key yang sama tidak boleh digunakan ulang untuk rincian pesanan yang berbeda.'
      );
    }
    return { order: existingOrder, idempotentReplay: true };
  }

  // 5. Compute authoritative monetary values in integer IDR
  const orderId = generateServerOrderId();

  const lineItems: OrderLineItemRecord[] = [];
  let totalQuantity = 0;
  let orderSubtotal = 0;

  for (const entry of normalizedItemsInput) {
    const product = catalog.find((p) => p.id === entry.productId)!;
    const unitPrice = product.defaultPrice!;
    const lineSubtotal = unitPrice * entry.quantity;

    totalQuantity += entry.quantity;
    orderSubtotal += lineSubtotal;

    lineItems.push({
      orderId,
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: entry.quantity,
      lineSubtotal,
    });
  }

  // 6. Persist order and order_items to PostgreSQL / Supabase
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: insertedOrder, error: insertOrderErr } = await supabase
        .from('orders')
        .insert({
          order_id: orderId,
          idempotency_key: rawIdempotencyKey,
          payload_fingerprint: payloadHash,
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          google_maps_url: googleMapsUrl,
          notes,
          total_quantity: totalQuantity,
          order_subtotal: orderSubtotal,
          currency: 'IDR',
          delivery_fee_status: 'unconfirmed_whatsapp',
          delivery_fee: null,
          provisional_total: orderSubtotal,
          status: 'pending_whatsapp',
        })
        .select('*')
        .single();

      if (insertOrderErr || !insertedOrder) {
        throw new Error('Failed to insert order into Supabase', { cause: insertOrderErr });
      }

      const { data: insertedItems, error: insertItemsErr } = await supabase
        .from('order_items')
        .insert(
          lineItems.map((li) => ({
            order_id: orderId,
            product_id: li.productId,
            product_name_snapshot: li.productName,
            unit_price: li.unitPrice,
            quantity: li.quantity,
            line_subtotal: li.lineSubtotal,
          }))
        )
        .select('*');

      if (insertItemsErr || !insertedItems) {
        throw new Error('Failed to insert order_items into Supabase', { cause: insertItemsErr });
      }

      const hydrated = hydrateOrderRecord(
        {
          orderId: insertedOrder.order_id,
          idempotencyKey: insertedOrder.idempotency_key,
          payloadFingerprint: insertedOrder.payload_fingerprint,
          customerName: insertedOrder.customer_name,
          customerPhone: insertedOrder.customer_phone,
          deliveryAddress: insertedOrder.delivery_address,
          googleMapsUrl: insertedOrder.google_maps_url,
          notes: insertedOrder.notes,
          totalQuantity: insertedOrder.total_quantity,
          orderSubtotal: insertedOrder.order_subtotal,
          currency: insertedOrder.currency,
          deliveryFeeStatus: insertedOrder.delivery_fee_status,
          deliveryFee: insertedOrder.delivery_fee,
          provisionalTotal: insertedOrder.provisional_total,
          status: insertedOrder.status,
          createdAt: insertedOrder.created_at,
          updatedAt: insertedOrder.updated_at,
        },
        insertedItems.map((row) => ({
          orderId: row.order_id,
          productId: row.product_id,
          productNameSnapshot: row.product_name_snapshot,
          unitPrice: row.unit_price,
          quantity: row.quantity,
          lineSubtotal: row.line_subtotal,
        })),
        catalog,
        'supabase'
      );

      return { order: hydrated, idempotentReplay: false };
    }

    if (isPostgresPoolConfigured()) {
      const insertedOrderRows = await db
        .insert(orders)
        .values({
          orderId,
          idempotencyKey: rawIdempotencyKey,
          payloadFingerprint: payloadHash,
          customerName,
          customerPhone,
          deliveryAddress,
          googleMapsUrl,
          notes,
          totalQuantity,
          orderSubtotal,
          currency: 'IDR',
          deliveryFeeStatus: 'unconfirmed_whatsapp',
          deliveryFee: null,
          provisionalTotal: orderSubtotal,
          status: 'pending_whatsapp',
        })
        .returning();

      const insertedOrder = insertedOrderRows[0];

      const insertedItemRows = await db
        .insert(orderItems)
        .values(
          lineItems.map((li) => ({
            orderId,
            productId: li.productId,
            productNameSnapshot: li.productName,
            unitPrice: li.unitPrice,
            quantity: li.quantity,
            lineSubtotal: li.lineSubtotal,
          }))
        )
        .returning();

      const hydrated = hydrateOrderRecord(
        insertedOrder,
        insertedItemRows,
        catalog,
        'postgresql'
      );

      return { order: hydrated, idempotentReplay: false };
    }
  } catch (error) {
    console.warn('Database order persistence skipped/failed, falling back to direct WhatsApp handoff:', error);
  }

  const nowIso = new Date().toISOString();
  const fallbackOrder = hydrateOrderRecord(
    {
      orderId,
      idempotencyKey: rawIdempotencyKey,
      payloadFingerprint: payloadHash,
      customerName,
      customerPhone,
      deliveryAddress,
      googleMapsUrl,
      notes,
      totalQuantity,
      orderSubtotal,
      currency: 'IDR',
      deliveryFeeStatus: 'unconfirmed_whatsapp',
      deliveryFee: null,
      provisionalTotal: orderSubtotal,
      status: 'pending_whatsapp',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    lineItems.map((li) => ({
      orderId,
      productId: li.productId,
      productNameSnapshot: li.productName,
      unitPrice: li.unitPrice,
      quantity: li.quantity,
      lineSubtotal: li.lineSubtotal,
    })),
    catalog,
    'postgresql'
  );

  return { order: { ...fallbackOrder, persistedToDatabase: false }, idempotentReplay: false };
}

export async function getOrderByIdForCustomer(
  orderId: string,
  callerIdempotencyKey?: string
): Promise<Partial<OrderRecord>> {
  if (!/^ORD-[0-9]{8}-[A-Z0-9]{6}$/.test(orderId)) {
    throw new ApiError(400, 'INVALID_ORDER_ID', 'Format nomor referensi pesanan tidak valid.');
  }

  const catalog = await getAuthoritativeCatalog();
  const order = await fetchOrderByOrderIdFromDb(orderId, catalog);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.');
  }

  if (callerIdempotencyKey && callerIdempotencyKey === order.idempotencyKey) {
    return order;
  }

  return {
    orderId: order.orderId,
    items: order.items,
    totalQuantity: order.totalQuantity,
    orderSubtotal: order.orderSubtotal,
    deliveryFee: order.deliveryFee,
    deliveryFeeStatus: order.deliveryFeeStatus,
    provisionalTotal: order.provisionalTotal,
    isFinalTotalKnown: order.isFinalTotalKnown,
    currency: order.currency,
    status: order.status,
    persistedToDatabase: order.persistedToDatabase,
    databaseBackend: order.databaseBackend,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function markOrderWhatsAppOpened(
  orderId: string,
  callerIdempotencyKey?: string
): Promise<OrderRecord> {
  if (!/^ORD-[0-9]{8}-[A-Z0-9]{6}$/.test(orderId)) {
    throw new ApiError(400, 'INVALID_ORDER_ID', 'Format nomor referensi pesanan tidak valid.');
  }

  const catalog = await getAuthoritativeCatalog();
  const order = await fetchOrderByOrderIdFromDb(orderId, catalog);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.');
  }

  if (!callerIdempotencyKey || callerIdempotencyKey !== order.idempotencyKey) {
    throw new ApiError(403, 'FORBIDDEN', 'Tidak diizinkan memperbarui status handoff pesanan ini.');
  }

  if (order.status !== 'pending_whatsapp') {
    return order;
  }

  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'awaiting_admin_confirmation',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
      if (error) {
        throw new Error('Failed to update order status in Supabase', { cause: error });
      }
    } else if (isPostgresPoolConfigured()) {
      await db
        .update(orders)
        .set({
          status: 'awaiting_admin_confirmation',
          updatedAt: new Date(),
        })
        .where(eq(orders.orderId, orderId));
    }

    const updated = await fetchOrderByOrderIdFromDb(orderId, catalog);
    return updated || { ...order, status: 'awaiting_admin_confirmation' };
  } catch (error) {
    console.error('Database status update failed:', error);
    throw new ApiError(
      503,
      'DATABASE_UPDATE_FAILED',
      'Gagal memperbarui status handoff pesanan di database.',
      { cause: error }
    );
  }
}

export interface VerifiedAdminIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export function getTrustedAdminEmails(): Set<string> {
  const emails = new Set<string>(DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()));
  const envAdmins = process.env.ADMIN_EMAILS || '';
  for (const part of envAdmins.split(',')) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed) emails.add(trimmed);
  }
  return emails;
}

export async function verifyAdminBearerToken(
  authHeader?: string
): Promise<VerifiedAdminIdentity> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token autentikasi admin wajib disertakan.');
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || idToken.length < 20) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token autentikasi tidak valid.');
  }

  let uid = '';
  let email = '';
  let emailVerified = false;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = (decoded.email || '').toLowerCase();
    emailVerified = Boolean(decoded.email_verified);
  } catch {
    // Fallback to Google Identity Toolkit lookup if running in a serverless environment without GCP ADC
    let response: Response;
    try {
      response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          firebaseConfig.apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
    } catch {
      throw new ApiError(503, 'AUTH_SERVICE_UNAVAILABLE', 'Gagal memverifikasi token autentikasi.');
    }

    if (!response.ok) {
      throw new ApiError(
        401,
        'INVALID_AUTH_TOKEN',
        'Token autentikasi tidak sah atau telah kedaluwarsa.'
      );
    }

    const data = (await response.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };

    const user = data.users?.[0];
    if (!user || !user.localId || !user.email) {
      throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Identitas pengguna tidak ditemukan.');
    }
    uid = user.localId;
    email = user.email.toLowerCase();
    emailVerified = user.emailVerified === true;
  }

  if (!emailVerified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Email akun harus terverifikasi.');
  }

  const trustedAdmins = getTrustedAdminEmails();
  if (!trustedAdmins.has(email)) {
    throw new ApiError(
      403,
      'FORBIDDEN_NOT_ADMIN',
      'Akun Anda tidak terdaftar dalam allowlist administrator CHICKCHAU.'
    );
  }

  if (isPostgresPoolConfigured()) {
    try {
      await getOrCreateUser(uid, email, 'admin');
    } catch (syncErr) {
      console.warn('Could not sync admin user to PostgreSQL users table:', syncErr);
    }
  }

  return {
    uid,
    email,
    emailVerified: true,
  };
}

export async function listAllOrdersForAdmin(): Promise<OrderRecord[]> {
  try {
    const catalog = await getAuthoritativeCatalog();
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data: orderRows, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (ordersErr) {
        throw new Error('Failed to list orders from Supabase', { cause: ordersErr });
      }
      const { data: itemRows, error: itemsErr } = await supabase.from('order_items').select('*');
      if (itemsErr) {
        throw new Error('Failed to list order_items from Supabase', { cause: itemsErr });
      }

      return (orderRows || []).map((row) =>
        hydrateOrderRecord(
          {
            orderId: row.order_id,
            idempotencyKey: row.idempotency_key,
            payloadFingerprint: row.payload_fingerprint,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            deliveryAddress: row.delivery_address,
            googleMapsUrl: row.google_maps_url,
            notes: row.notes,
            totalQuantity: row.total_quantity,
            orderSubtotal: row.order_subtotal,
            currency: row.currency,
            deliveryFeeStatus: row.delivery_fee_status,
            deliveryFee: row.delivery_fee,
            provisionalTotal: row.provisional_total,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
          (itemRows || [])
            .filter((it) => it.order_id === row.order_id)
            .map((it) => ({
              orderId: it.order_id,
              productId: it.product_id,
              productNameSnapshot: it.product_name_snapshot,
              unitPrice: it.unit_price,
              quantity: it.quantity,
              lineSubtotal: it.line_subtotal,
            })),
          catalog,
          'supabase'
        )
      );
    }

    if (isPostgresPoolConfigured()) {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const allItems = await db.select().from(orderItems);
      return allOrders.map((row) =>
        hydrateOrderRecord(
          row,
          allItems.filter((it) => it.orderId === row.orderId),
          catalog,
          'postgresql'
        )
      );
    }

    throw new ApiError(
      503,
      'DATABASE_NOT_CONFIGURED',
      'Database PostgreSQL / Supabase belum dikonfigurasi di server.'
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error('Database admin order list failed:', error);
    throw new ApiError(503, 'DATABASE_QUERY_FAILED', 'Gagal memuat daftar pesanan dari database.', {
      cause: error,
    });
  }
}

export async function updateOrderStatusByAdmin(
  orderId: string,
  nextStatusRaw: unknown
): Promise<OrderRecord> {
  if (!/^ORD-[0-9]{8}-[A-Z0-9]{6}$/.test(orderId)) {
    throw new ApiError(400, 'INVALID_ORDER_ID', 'Format nomor referensi pesanan tidak valid.');
  }

  const catalog = await getAuthoritativeCatalog();
  const order = await fetchOrderByOrderIdFromDb(orderId, catalog);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.');
  }

  if (
    typeof nextStatusRaw !== 'string' ||
    !VALID_ORDER_STATUSES.has(nextStatusRaw as OrderStatus)
  ) {
    throw new ApiError(400, 'INVALID_STATUS', 'Status pesanan tidak valid.');
  }

  const nextStatus = nextStatusRaw as OrderStatus;
  if (order.status === nextStatus) {
    return order;
  }

  const allowedNext = ALLOWED_STATUS_TRANSITIONS[order.status];
  if (!allowedNext.includes(nextStatus)) {
    throw new ApiError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Transisi status dari "${order.status}" ke "${nextStatus}" tidak diizinkan.`
    );
  }

  const nextDeliveryFeeStatus =
    nextStatus === 'confirmed' || nextStatus === 'preparing' || nextStatus === 'completed'
      ? 'confirmed'
      : order.deliveryFeeStatus;

  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({
          status: nextStatus,
          delivery_fee_status: nextDeliveryFeeStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);
      if (error) {
        throw new Error('Failed to update order status in Supabase', { cause: error });
      }
    } else if (isPostgresPoolConfigured()) {
      await db
        .update(orders)
        .set({
          status: nextStatus,
          deliveryFeeStatus: nextDeliveryFeeStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.orderId, orderId));
    }

    const updated = await fetchOrderByOrderIdFromDb(orderId, catalog);
    return (
      updated || {
        ...order,
        status: nextStatus,
        deliveryFeeStatus: nextDeliveryFeeStatus,
      }
    );
  } catch (error) {
    console.error('Database admin order status update failed:', error);
    throw new ApiError(503, 'DATABASE_UPDATE_FAILED', 'Gagal memperbarui status pesanan.', {
      cause: error,
    });
  }
}

export async function updateCatalogPriceByAdmin(
  productIdRaw: string,
  unitPriceRaw: unknown,
  availableRaw: unknown,
  _admin: VerifiedAdminIdentity
): Promise<Product> {
  const base = BASE_PRODUCTS.find((p) => p.id === productIdRaw);
  if (!base) {
    throw new ApiError(404, 'INVALID_PRODUCT', 'Produk tidak ditemukan dalam katalog.');
  }

  if (
    typeof unitPriceRaw !== 'number' ||
    !Number.isInteger(unitPriceRaw) ||
    unitPriceRaw < 1000 ||
    unitPriceRaw > 1000000
  ) {
    throw new ApiError(
      400,
      'INVALID_PRICE',
      'Harga produk harus berupa bilangan bulat Rupiah antara Rp1.000 hingga Rp1.000.000.'
    );
  }

  const available = typeof availableRaw === 'boolean' ? availableRaw : true;

  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('products').upsert({
        id: base.id,
        name: base.name,
        short_name: base.shortName,
        category: base.category,
        unit_price: unitPriceRaw,
        currency: 'IDR',
        available,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        throw new Error('Failed to update product in Supabase', { cause: error });
      }
    } else if (isPostgresPoolConfigured()) {
      await db
        .insert(products)
        .values({
          id: base.id,
          name: base.name,
          shortName: base.shortName,
          category: base.category,
          unitPrice: unitPriceRaw,
          currency: 'IDR',
          available,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            unitPrice: unitPriceRaw,
            available,
            updatedAt: new Date(),
          },
        });
    }

    const updatedCatalog = await getAuthoritativeCatalog();
    return updatedCatalog.find((p) => p.id === base.id)!;
  } catch (error) {
    console.error('Database admin catalog update failed:', error);
    throw new ApiError(
      503,
      'DATABASE_UPDATE_FAILED',
      'Gagal memperbarui harga produk di database.',
      { cause: error }
    );
  }
}
