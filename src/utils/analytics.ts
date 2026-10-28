import { normalizeGa4MeasurementId } from '../config/siteConfig';
import { Product } from '../data/products';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __chickchauGa4Initialized?: string;
  }
}

const FORBIDDEN_PII_KEYS = new Set([
  'customername',
  'fullname',
  'name',
  'customerphone',
  'whatsappphone',
  'phone',
  'telephone',
  'deliveryaddress',
  'address',
  'googlemapsurl',
  'mapsurl',
  'notes',
  'email',
  'lat',
  'lng',
  'latitude',
  'longitude'
]);

/**
 * Strips any personally identifiable information (PII) from GA4 event parameters.
 */
export function sanitizeAnalyticsPayload(
  params: Record<string, unknown>
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const normalizedKey = key.toLowerCase().replace(/[_\-\s]/g, '');
    if (FORBIDDEN_PII_KEYS.has(normalizedKey)) {
      continue;
    }
    if (Array.isArray(value)) {
      clean[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeAnalyticsPayload(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeAnalyticsPayload(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function getConfiguredGa4MeasurementId(): string | null {
  const raw = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined) || '';
  return normalizeGa4MeasurementId(raw);
}

let lastTrackedRoute: string | null = null;
let hasTrackedItemListView = false;

export function initGa4(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const measurementId = getConfiguredGa4MeasurementId();
  if (!measurementId) {
    return false;
  }

  if (window.__chickchauGa4Initialized === measurementId) {
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  if (!document.getElementById('chickchau-ga4-script')) {
    const script = document.createElement('script');
    script.id = 'chickchau-ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  // Disable automatic page_view to prevent duplicate SPA page_view events
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true
  });

  window.__chickchauGa4Initialized = measurementId;
  return true;
}

export function emitGa4Event(
  eventName: string,
  rawParams: Record<string, unknown> = {}
): boolean {
  // Never emit purchase unless an explicit server-verified payment/completion trigger is used
  if (eventName === 'purchase') {
    return false;
  }

  const measurementId = getConfiguredGa4MeasurementId();
  if (!measurementId) {
    return false;
  }

  initGa4();
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return false;
  }

  const safeParams = sanitizeAnalyticsPayload(rawParams);
  window.gtag('event', eventName, safeParams);
  return true;
}

export function trackPageView(route: 'home' | 'cart'): void {
  const pagePath = route === 'cart' ? '/cart' : '/';
  if (lastTrackedRoute === pagePath) {
    return;
  }
  lastTrackedRoute = pagePath;

  emitGa4Event('page_view', {
    page_path: pagePath,
    page_title:
      route === 'cart'
        ? 'Keranjang & Checkout | CHICKCHAU'
        : 'CHICKCHAU | Crispy Bites, Creamy Sips'
  });
}

export function trackViewItemList(products: Product[]): void {
  if (hasTrackedItemListView || products.length === 0) return;
  hasTrackedItemListView = true;

  emitGa4Event('view_item_list', {
    item_list_id: 'chickchau_main_menu',
    item_list_name: 'Menu Utama CHICKCHAU',
    items: products.map((p, index) => ({
      item_id: p.id,
      item_name: p.name,
      item_category: p.category,
      price: p.defaultPrice ?? 0,
      index: index + 1
    }))
  });
}

export function trackSelectItem(product: Product): void {
  emitGa4Event('select_item', {
    item_list_id: 'chickchau_main_menu',
    item_list_name: 'Menu Utama CHICKCHAU',
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.defaultPrice ?? 0
      }
    ]
  });
}

export function trackAddToCart(
  product: Product,
  quantityAdded: number,
  unitPrice: number
): void {
  emitGa4Event('add_to_cart', {
    currency: 'IDR',
    value: unitPrice * quantityAdded,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: unitPrice,
        quantity: quantityAdded
      }
    ]
  });
}

export function trackRemoveFromCart(
  product: Product,
  quantityRemoved: number,
  unitPrice: number
): void {
  emitGa4Event('remove_from_cart', {
    currency: 'IDR',
    value: unitPrice * quantityRemoved,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: unitPrice,
        quantity: quantityRemoved
      }
    ]
  });
}

export function trackBeginCheckout(
  items: Array<{ product: Product; quantity: number; unitPrice: number }>,
  orderSubtotal: number
): void {
  emitGa4Event('begin_checkout', {
    currency: 'IDR',
    value: orderSubtotal,
    items: items.map(item => ({
      item_id: item.product.id,
      item_name: item.product.name,
      item_category: item.product.category,
      price: item.unitPrice,
      quantity: item.quantity
    }))
  });
}

export function trackAddShippingInfo(
  totalQuantity: number,
  orderSubtotal: number
): void {
  emitGa4Event('add_shipping_info', {
    currency: 'IDR',
    value: orderSubtotal,
    shipping_tier: 'whatsapp_delivery_unconfirmed',
    total_quantity: totalQuantity
  });
}

export function trackOrderCreated(order: {
  orderId: string;
  orderSubtotal: number;
  totalQuantity: number;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
}): void {
  emitGa4Event('order_created', {
    transaction_id: order.orderId,
    currency: 'IDR',
    value: order.orderSubtotal,
    total_quantity: order.totalQuantity,
    delivery_fee_status: 'unconfirmed_whatsapp',
    items: order.items.map(item => ({
      item_id: item.productId,
      item_name: item.productName,
      price: item.unitPrice,
      quantity: item.quantity
    }))
  });
}

export function trackWhatsAppCheckoutClick(order: {
  orderId: string;
  orderSubtotal: number;
  totalQuantity: number;
}): void {
  emitGa4Event('whatsapp_checkout_click', {
    transaction_id: order.orderId,
    currency: 'IDR',
    value: order.orderSubtotal,
    total_quantity: order.totalQuantity
  });
}
