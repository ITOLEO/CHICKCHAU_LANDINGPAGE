/**
 * Centralized authoritative configuration for CHICKCHAU.
 * Shared across server and client modules.
 */

export const WHATSAPP_DISPLAY_NUMBER = '+62 811-2199-334';
export const WHATSAPP_INTERNATIONAL_NUMBER = '628112199334';
export const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_INTERNATIONAL_NUMBER}`;

export const DEFAULT_ADMIN_EMAILS: readonly string[] = ['itleo4444@gmail.com'];

export const BRAND_NAME = 'CHICKCHAU';
export const BRAND_TAGLINE = 'Crispy Bites, Creamy Sips.';
export const HOMEPAGE_TITLE = 'CHICKCHAU | Crispy Bites, Creamy Sips';
export const HOMEPAGE_DESCRIPTION =
  'Nikmati Crispy Chickchau dan Chikchau Capcin dari CHICKCHAU. Pilih produk favoritmu dan pesan langsung melalui WhatsApp.';
export const CART_TITLE = 'Keranjang & Checkout | CHICKCHAU';
export const CART_DESCRIPTION =
  'Selesaikan pesanan Chikchau Capcin dan Crispy Chickchau kamu di CHICKCHAU melalui WhatsApp.';
export const DEFAULT_PRODUCTION_SITE_URL = 'https://www.chickchau.my.id';
export const OG_IMAGE_PATH = '/assets/og-images.png';
export const OG_IMAGE_TYPE = 'image/png';
export const OG_IMAGE_WIDTH = '1200';
export const OG_IMAGE_HEIGHT = '630';
export const OG_IMAGE_ALT = 'CHICKCHAU logo: a line-art chicken beside an iced drink';
export const LOGO_PATH = '/logo.png';

export const SEO_DEFAULTS = {
  siteName: BRAND_NAME,
  homeTitle: HOMEPAGE_TITLE,
  cartTitle: CART_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  locale: 'id_ID',
  language: 'id',
  themeColor: '#710014',
  defaultSiteUrl: DEFAULT_PRODUCTION_SITE_URL,
  ogImagePath: OG_IMAGE_PATH,
  ogImageType: OG_IMAGE_TYPE,
  ogImageWidth: OG_IMAGE_WIDTH,
  ogImageHeight: OG_IMAGE_HEIGHT,
  ogImageAlt: OG_IMAGE_ALT,
} as const;

const PLACEHOLDER_DOMAIN_PATTERNS = [
  'your-real-production-domain',
  'example.com',
  'site_url',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '.run.app',
  '.web.app',
  '.firebaseapp.com',
  '.vercel.app',
];

/**
 * Validates and normalizes a production site origin.
 * Returns null if the value is missing, non-HTTPS, a placeholder, localhost, or a temporary preview URL (.run.app, .vercel.app, etc.).
 */
export function normalizeProductionSiteUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.')) {
      return null;
    }
    for (const pattern of PLACEHOLDER_DOMAIN_PATTERNS) {
      if (host === pattern || host.endsWith(pattern) || trimmed.toLowerCase().includes(pattern)) {
        return null;
      }
    }
    // Consistent trailing-slash policy: origin without trailing slash; homepage canonical is `${origin}/`
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Validates a Google Search Console verification token.
 * Rejects empty strings, placeholders, or strings with whitespace/HTML characters.
 */
export function normalizeGoogleSiteVerification(rawToken?: string | null): string | null {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const trimmed = rawToken.trim();
  if (!trimmed || trimmed.length < 10 || trimmed.length > 128) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('your_real_verification_token') ||
    lower.includes('placeholder') ||
    lower.includes('your-token')
  ) {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Validates a GA4 Measurement ID.
 * Must match G-XXXXXXXXXX format and not be a placeholder like G-XXXXXXXXXX or G-0000000000.
 */
export function normalizeGa4MeasurementId(rawId?: string | null): string | null {
  if (!rawId || typeof rawId !== 'string') return null;
  const trimmed = rawId.trim().toUpperCase();
  if (!/^G-[A-Z0-9]{6,16}$/.test(trimmed)) {
    return null;
  }
  if (/^G-X+$/.test(trimmed) || /^G-0+$/.test(trimmed) || trimmed === 'G-1234567890') {
    return null;
  }
  return trimmed;
}
