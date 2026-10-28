import {
  WHATSAPP_DISPLAY_NUMBER,
  WHATSAPP_INTERNATIONAL_NUMBER,
  WHATSAPP_BASE_URL
} from '../config/siteConfig';

export type ProductId = 'capcin' | 'shihlin';

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  category: 'Drinks' | 'Food';
  description: string;
  defaultPrice: number | null;
  available: boolean;
  tags: string[];
  imageUrl: string;
}

export const BASE_PRODUCTS: Product[] = [
  {
    id: 'capcin',
    name: 'Chikchau Capcin',
    shortName: 'Chikchau Capcin',
    category: 'Drinks',
    description: 'Minuman cappuccino dingin 250ml yang creamy dengan potongan cincau hitam segar.',
    defaultPrice: 8000,
    available: true,
    tags: ['Dingin', 'Cincau Hitam', 'Creamy'],
    imageUrl: '/assets/capcin_white.png'
  },
  {
    id: 'shihlin',
    name: 'Crispy Chickchau',
    shortName: 'Crispy Chickchau',
    category: 'Food',
    description: 'Fillet dada ayam goreng tepung renyah khas Taiwan dengan taburan bumbu gurih.',
    defaultPrice: 30000,
    available: true,
    tags: ['Renyah', 'Gurih', 'Bumbu Spesial'],
    imageUrl: '/assets/shihlin_white.png'
  }
];

export const SHIPPING_RATE_PER_KM = 2000;

export const BUSINESS_INFO = {
  name: 'CHICKCHAU',
  tagline: 'Crispy Bites, Creamy Sips.',
  whatsappNumber: WHATSAPP_DISPLAY_NUMBER,
  whatsappInternational: WHATSAPP_INTERNATIONAL_NUMBER,
  whatsappBaseUrl: WHATSAPP_BASE_URL,
  operatingHours: 'Sistem Pre-Order (Minimal H-1)',
  locationCity: 'Tabanan & Denpasar, Bali, Indonesia',
  defaultMapCenter: { lat: -8.6226624, lng: 115.1042507 },
  shippingRatePerKm: SHIPPING_RATE_PER_KM,
  shippingPromoLabel: 'Discount 100% Special Offer'
};

export function calculateHaversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawKm = R * c;
  if (!Number.isFinite(rawKm) || rawKm <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(rawKm));
}

export function extractCoordinatesFromMapsUrl(
  url: string
): { lat: number; lng: number } | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Match ?q=-8.65,115.21 or @-8.65,115.21 or !3d-8.65!4d115.21
  const queryMatch = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const bangMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    const lat = parseFloat(bangMatch[1]);
    const lng = parseFloat(bangMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export function calculateShippingPromo(
  targetCoords?: { lat: number; lng: number } | null,
  googleMapsUrl?: string
): {
  distanceKm: number;
  ratePerKm: number;
  originalShippingFee: number;
  finalShippingFee: 0;
  discountPercent: 100;
  promoLabel: string;
} {
  const coords =
    targetCoords || (googleMapsUrl ? extractCoordinatesFromMapsUrl(googleMapsUrl) : null);
  const distanceKm = coords
    ? calculateHaversineDistanceKm(BUSINESS_INFO.defaultMapCenter, coords)
    : 1;
  const originalShippingFee = distanceKm * SHIPPING_RATE_PER_KM;
  return {
    distanceKm,
    ratePerKm: SHIPPING_RATE_PER_KM,
    originalShippingFee,
    finalShippingFee: 0,
    discountPercent: 100,
    promoLabel: BUSINESS_INFO.shippingPromoLabel
  };
}

