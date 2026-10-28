import { formatRupiah } from './formatters';
import { CheckoutFormData } from './validation';
import {
  Product,
  BUSINESS_INFO,
  SHIPPING_RATE_PER_KM,
  calculateShippingPromo
} from '../data/products';
import {
  WHATSAPP_INTERNATIONAL_NUMBER,
  WHATSAPP_DISPLAY_NUMBER,
  WHATSAPP_BASE_URL
} from '../config/siteConfig';

export interface CartItemDetailed {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDetails {
  orderReference: string;
  items: CartItemDetailed[];
  totalQuantity: number;
  orderSubtotal: number;
  customerData: CheckoutFormData;
  distanceKm?: number;
}

export const CHICKCHAU_WA_NUMBER = WHATSAPP_INTERNATIONAL_NUMBER;
export const CHICKCHAU_WA_DISPLAY = WHATSAPP_DISPLAY_NUMBER;

export function buildWhatsAppMessage(order: OrderDetails): string {
  const { orderReference, items, totalQuantity, orderSubtotal, customerData, distanceKm } = order;

  const promo = calculateShippingPromo(null, customerData.googleMapsUrl);
  const resolvedDistanceKm =
    typeof distanceKm === 'number' && distanceKm > 0 ? Math.max(1, Math.round(distanceKm)) : promo.distanceKm;
  const originalShippingFee = resolvedDistanceKm * SHIPPING_RATE_PER_KM;
  const originalTotalWithShipping = orderSubtotal + originalShippingFee;

  const itemsText = items
    .map((item, index) => {
      const num = index + 1;
      return `${num}. ${item.product.name}\n   Qty: ${item.quantity}\n   Harga satuan: ${formatRupiah(item.unitPrice)}\n   Subtotal: ${formatRupiah(item.subtotal)}`;
    })
    .join('\n\n');

  const notesText =
    customerData.notes && customerData.notes.trim().length > 0
      ? customerData.notes.trim()
      : 'Tidak ada';

  return [
    'Halo CHICKCHAU! Saya ingin melakukan Pre-Order (Minimal H-1).',
    '',
    '*DETAIL PESANAN*',
    '',
    `Ref: ${orderReference}`,
    `Sistem: ${BUSINESS_INFO.operatingHours}`,
    `Area Layanan: ${BUSINESS_INFO.locationCity}`,
    '',
    itemsText,
    '',
    '*RINGKASAN BIAYA & PROMO ONGKIR*',
    '',
    `Total item: ${totalQuantity}`,
    `Subtotal produk: ${formatRupiah(orderSubtotal)}`,
    `Total pengiriman: ~${formatRupiah(originalShippingFee)}~ Rp0 (${BUSINESS_INFO.shippingPromoLabel})`,
    `Total pembayaran: ~${formatRupiah(originalTotalWithShipping)}~ *${formatRupiah(orderSubtotal)}*`,
    '',
    '*DATA PELANGGAN*',
    '',
    `Nama: ${customerData.fullName.trim()}`,
    `WhatsApp: ${customerData.whatsappPhone.trim()}`,
    '',
    '*ALAMAT PENGANTARAN (TABANAN / DENPASAR, BALI)*',
    '',
    customerData.deliveryAddress.trim(),
    '',
    '*LOKASI GOOGLE MAPS*',
    '',
    customerData.googleMapsUrl.trim(),
    '',
    '*CATATAN TAMBAHAN*',
    '',
    notesText,
    '',
    'Mohon konfirmasi jadwal Pre-Order (Minimal H-1) saya.',
    '',
    'Terima kasih!'
  ].join('\n');
}

export function generateWhatsAppUrl(order: OrderDetails): string {
  const message = buildWhatsAppMessage(order);
  const encoded = encodeURIComponent(message);
  return `${WHATSAPP_BASE_URL}?text=${encoded}`;
}
