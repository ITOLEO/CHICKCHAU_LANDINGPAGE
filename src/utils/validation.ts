export interface CheckoutFormData {
  fullName: string;
  whatsappPhone: string;
  deliveryAddress: string;
  googleMapsUrl: string;
  notes: string;
}

export interface ValidationErrors {
  fullName?: string;
  whatsappPhone?: string;
  deliveryAddress?: string;
  googleMapsUrl?: string;
  notes?: string;
  general?: string;
}

export const FIELD_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 80,
  phoneMin: 9,
  phoneMax: 20,
  addressMin: 10,
  addressMax: 300,
  mapsUrlMin: 12,
  mapsUrlMax: 500,
  notesMax: 250,
  maxItemQuantity: 50
} as const;

export const PHONE_REGEX = /^(?:08|\+628|628)[0-9]{7,12}$/;

const ALLOWED_GOOGLE_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.com',
  'www.google.com',
  'google.com',
  'www.google.co.id',
  'google.co.id'
]);

/**
 * Strictly validates that a URL is an HTTPS Google Maps location link.
 */
export function isValidGoogleMapsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < FIELD_LIMITS.mapsUrlMin || trimmed.length > FIELD_LIMITS.mapsUrlMax) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!ALLOWED_GOOGLE_MAPS_HOSTS.has(hostname)) {
      return false;
    }

    if (hostname === 'maps.app.goo.gl') {
      return parsed.pathname.length > 1;
    }

    if (hostname === 'goo.gl') {
      return parsed.pathname.startsWith('/maps/') && parsed.pathname.length > 6;
    }

    if (hostname === 'maps.google.com') {
      return parsed.pathname.length >= 1 && (parsed.search.length > 0 || parsed.pathname.length > 1);
    }

    // google.com / www.google.com / google.co.id
    return parsed.pathname.startsWith('/maps');
  } catch {
    return false;
  }
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.trim().replace(/[\s\-().]/g, '');
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length < FIELD_LIMITS.phoneMin || normalized.length > FIELD_LIMITS.phoneMax) {
    return false;
  }
  return PHONE_REGEX.test(normalized);
}

export function validateCheckoutForm(data: CheckoutFormData): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};

  const fullName = (data.fullName || '').trim();
  if (fullName.length === 0) {
    errors.fullName = 'Nama lengkap wajib diisi.';
  } else if (fullName.length < FIELD_LIMITS.fullNameMin) {
    errors.fullName = `Nama lengkap minimal ${FIELD_LIMITS.fullNameMin} karakter.`;
  } else if (fullName.length > FIELD_LIMITS.fullNameMax) {
    errors.fullName = `Nama lengkap maksimal ${FIELD_LIMITS.fullNameMax} karakter.`;
  }

  const normalizedPhone = normalizePhoneNumber(data.whatsappPhone || '');
  if (normalizedPhone.length === 0) {
    errors.whatsappPhone = 'Nomor WhatsApp wajib diisi.';
  } else if (!isValidPhoneNumber(normalizedPhone)) {
    errors.whatsappPhone =
      'Format nomor WhatsApp tidak valid (gunakan awalan 08, 628, atau +628 dengan 9-15 digit angka).';
  }

  const deliveryAddress = (data.deliveryAddress || '').trim();
  if (deliveryAddress.length === 0) {
    errors.deliveryAddress = 'Alamat pengantaran wajib diisi.';
  } else if (deliveryAddress.length < FIELD_LIMITS.addressMin) {
    errors.deliveryAddress = `Mohon tulis detail alamat lengkap minimal ${FIELD_LIMITS.addressMin} karakter (nama jalan, nomor rumah, atau patokan).`;
  } else if (deliveryAddress.length > FIELD_LIMITS.addressMax) {
    errors.deliveryAddress = `Alamat pengantaran maksimal ${FIELD_LIMITS.addressMax} karakter.`;
  }

  const googleMapsUrl = (data.googleMapsUrl || '').trim();
  if (googleMapsUrl.length === 0) {
    errors.googleMapsUrl = 'Pilih titik di peta di atas atau tempel tautan HTTPS Google Maps resmi.';
  } else if (!isValidGoogleMapsUrl(googleMapsUrl)) {
    errors.googleMapsUrl =
      'Format tautan tidak valid. Gunakan tautan HTTPS resmi Google Maps (https://maps.app.goo.gl/... atau https://www.google.com/maps...).';
  }

  const notes = (data.notes || '').trim();
  if (notes.length > FIELD_LIMITS.notesMax) {
    errors.notes = `Catatan tambahan maksimal ${FIELD_LIMITS.notesMax} karakter.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
