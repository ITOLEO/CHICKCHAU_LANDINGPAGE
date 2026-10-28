import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  MapPin,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  ShoppingBag,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah } from '../utils/formatters';
import {
  BUSINESS_INFO,
  calculateShippingPromo
} from '../data/products';
import { ProductVisual } from './ProductVisuals';
import {
  CheckoutFormData,
  ValidationErrors,
  validateCheckoutForm
} from '../utils/validation';
import {
  CHICKCHAU_WA_DISPLAY,
  CHICKCHAU_WA_BASE_URL,
  generateClientOrderReference,
  generateWhatsAppUrl,
  openWhatsAppDirect
} from '../utils/whatsapp';
import {
  DeliveryMapPicker,
  SelectedDeliveryLocation,
  LatLngPoint
} from './DeliveryMapPicker';
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackOrderCreated,
  trackWhatsAppCheckoutClick
} from '../utils/analytics';

interface CartPageProps {
  onBackToMenu: () => void;
}

interface ServerOrderResponse {
  orderId: string;
  idempotencyKey: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineSubtotal: number;
  }>;
  totalQuantity: number;
  orderSubtotal: number;
  provisionalTotal: number;
  deliveryFeeStatus: string;
  status: string;
  whatsappUrl: string;
}

function createIdempotencyKey(): string {
  const randomPart = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
  return `idem_${Date.now().toString(36)}_${randomPart}`;
}

export const CartPage: React.FC<CartPageProps> = ({ onBackToMenu }) => {
  const {
    items,
    totalQuantity,
    orderSubtotal,
    hasUnconfiguredItemInCart,
    canCheckout,
    updateQuantity,
    removeFromCart
  } = useCart();

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    whatsappPhone: '',
    deliveryAddress: '',
    googleMapsUrl: '',
    notes: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [selectedCoords, setSelectedCoords] = useState<LatLngPoint | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<ServerOrderResponse | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    orderId?: string;
    waUrl?: string;
  } | null>(null);

  const clientOrderRef = useRef<string>(generateClientOrderReference());
  const hasSelectedLocation = selectedCoords !== null;
  const shippingPromo = calculateShippingPromo(selectedCoords, formData.googleMapsUrl);
  const originalTotalWithShipping = orderSubtotal + shippingPromo.originalShippingFee;

  const idempotencyStateRef = useRef<{ fingerprint: string; key: string }>({
    fingerprint: '',
    key: createIdempotencyKey()
  });

  const hasFiredBeginCheckoutRef = useRef(false);

  useEffect(() => {
    if (items.length > 0 && !hasFiredBeginCheckoutRef.current) {
      hasFiredBeginCheckoutRef.current = true;
      trackBeginCheckout(items, orderSubtotal);
    }
  }, [items, orderSubtotal]);

  const getPayloadFingerprint = useCallback(
    (data: CheckoutFormData) => {
      return JSON.stringify({
        items: items.map(i => ({ id: i.product.id, qty: i.quantity })),
        fullName: data.fullName.trim(),
        whatsappPhone: data.whatsappPhone.trim(),
        deliveryAddress: data.deliveryAddress.trim(),
        googleMapsUrl: data.googleMapsUrl.trim(),
        notes: data.notes.trim()
      });
    },
    [items]
  );

  const getOrRotateIdempotencyKey = useCallback(
    (data: CheckoutFormData): string => {
      const fp = getPayloadFingerprint(data);
      if (idempotencyStateRef.current.fingerprint !== fp) {
        idempotencyStateRef.current = {
          fingerprint: fp,
          key: createIdempotencyKey()
        };
        clientOrderRef.current = generateClientOrderReference();
      }
      return idempotencyStateRef.current.key;
    },
    [getPayloadFingerprint]
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name as keyof ValidationErrors];
        return next;
      });
    }
  };

  const handleMapLocationSelect = useCallback((loc: SelectedDeliveryLocation) => {
    setSelectedCoords({ lat: loc.lat, lng: loc.lng });
    setFormData(prev => {
      const nextAddress =
        prev.deliveryAddress.trim().length === 0 && loc.formattedAddress
          ? loc.formattedAddress
          : prev.deliveryAddress;

      return {
        ...prev,
        googleMapsUrl: loc.googleMapsUrl,
        deliveryAddress: nextAddress
      };
    });

    setErrors(prev => {
      const next = { ...prev };
      delete next.googleMapsUrl;
      if (loc.formattedAddress) {
        delete next.deliveryAddress;
      }
      return next;
    });
  }, []);

  const notifyWhatsAppOpened = async (orderId: string, idempotencyKey: string) => {
    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}/whatsapp-opened`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ idempotencyKey })
      });
    } catch {
      // Non-blocking status progression notification
    }
  };

  const buildDirectWaUrl = useCallback(
    (orderReference: string) => {
      return generateWhatsAppUrl({
        orderReference,
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        })),
        totalQuantity,
        orderSubtotal,
        customerData: formData,
        distanceKm: shippingPromo.distanceKm
      });
    },
    [items, totalQuantity, orderSubtotal, formData, shippingPromo.distanceKm]
  );

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutNotice(null);

    if (items.length === 0 || totalQuantity === 0) {
      setErrors({ general: 'Keranjang belanja Anda masih kosong.' });
      return;
    }

    if (hasUnconfiguredItemInCart) {
      setErrors({
        general:
          'Ada produk di keranjang yang belum memiliki harga resmi. Checkout belum dapat diproses.'
      });
      return;
    }

    const validation = validateCheckoutForm(formData);
    const nextErrors: ValidationErrors = { ...validation.errors };

    if (!hasSelectedLocation) {
      nextErrors.googleMapsUrl =
        'Silakan pilih titik lokasi pengantaran pada peta terlebih dahulu agar harga total muncul.';
    }

    if (!validation.isValid || !hasSelectedLocation) {
      setErrors(nextErrors);
      const firstErrorKey = Object.keys(nextErrors)[0];
      const element = document.getElementById(`field-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const idempotencyKey = getOrRotateIdempotencyKey(formData);
    const immediateOrderRef = clientOrderRef.current;
    const immediateWaUrl = buildDirectWaUrl(immediateOrderRef);

    // Connect immediately to wa.me/628112199334 inside the user click gesture
    // so mobile & desktop browsers never block the WhatsApp connection.
    openWhatsAppDirect(immediateWaUrl);

    try {
      trackAddShippingInfo(totalQuantity, orderSubtotal);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          idempotencyKey,
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          customerName: formData.fullName.trim(),
          customerPhone: formData.whatsappPhone.trim(),
          deliveryAddress: formData.deliveryAddress.trim(),
          googleMapsUrl: formData.googleMapsUrl.trim(),
          notes: formData.notes.trim()
        })
      });

      const payload = (await response.json()) as {
        order?: ServerOrderResponse;
        idempotentReplay?: boolean;
        error?: { code?: string; message?: string };
      };

      if (response.ok && payload.order) {
        const serverOrder = payload.order;
        setCreatedOrder(serverOrder);

        if (!payload.idempotentReplay) {
          trackOrderCreated({
            orderId: serverOrder.orderId,
            orderSubtotal: serverOrder.orderSubtotal,
            totalQuantity: serverOrder.totalQuantity,
            items: serverOrder.items
          });
        }

        trackWhatsAppCheckoutClick({
          orderId: serverOrder.orderId,
          orderSubtotal: serverOrder.orderSubtotal,
          totalQuantity: serverOrder.totalQuantity
        });

        void notifyWhatsAppOpened(serverOrder.orderId, serverOrder.idempotencyKey);

        setCheckoutNotice({
          type: 'success',
          orderId: serverOrder.orderId,
          message: `Pesanan ${serverOrder.orderId} langsung terhubung ke WhatsApp resmi CHICKCHAU (${CHICKCHAU_WA_DISPLAY}). Jika aplikasi WhatsApp belum terbuka otomatis, ketuk tombol di bawah:`,
          waUrl: serverOrder.whatsappUrl
        });
      } else {
        trackWhatsAppCheckoutClick({
          orderId: immediateOrderRef,
          orderSubtotal,
          totalQuantity
        });

        setCheckoutNotice({
          type: 'success',
          orderId: immediateOrderRef,
          message: `Pesanan ${immediateOrderRef} langsung diteruskan ke WhatsApp resmi CHICKCHAU (${CHICKCHAU_WA_DISPLAY}). Jika aplikasi WhatsApp belum terbuka otomatis, ketuk tombol di bawah:`,
          waUrl: immediateWaUrl
        });
      }
    } catch {
      trackWhatsAppCheckoutClick({
        orderId: immediateOrderRef,
        orderSubtotal,
        totalQuantity
      });

      setCheckoutNotice({
        type: 'success',
        orderId: immediateOrderRef,
        message: `Pesanan ${immediateOrderRef} langsung diteruskan ke WhatsApp resmi CHICKCHAU (${CHICKCHAU_WA_DISPLAY}). Jika aplikasi WhatsApp belum terbuka otomatis, ketuk tombol di bawah:`,
        waUrl: immediateWaUrl
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="py-10 sm:py-20 min-h-[65vh] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FDF8F4] rounded-2xl sm:rounded-3xl border border-[#EBD9D0] flex items-center justify-center mx-auto mb-5 shadow-[0_12px_28px_-14px_rgba(113,0,20,0.12)]">
            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 text-[#710014]" />
          </div>

          <h1 className="font-display text-xl sm:text-3xl uppercase tracking-wide text-[#28191B] mb-2">
            KERANJANG KAMU MASIH KOSONG
          </h1>

          <p className="text-xs sm:text-sm text-[#594345] mb-6 sm:mb-8">
            Pilih porsi Chikchau Capcin atau Crispy Chickchau terlebih dahulu untuk jadwal pengantaran di Tabanan &amp; Denpasar, Bali.
          </p>

          <button
            type="button"
            onClick={onBackToMenu}
            className="min-h-[44px] sm:min-h-[48px] px-7 py-2.5 sm:py-3 rounded-full bg-[#710014] hover:bg-[#8F1025] text-white font-bold text-xs sm:text-sm transition-colors inline-flex items-center gap-2 shadow-[0_10px_24px_-8px_rgba(113,0,20,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lihat Produk</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="py-5 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={onBackToMenu}
            className="min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-2 text-xs font-bold text-[#710014] hover:bg-[#F8E5D8]/60 bg-white border border-[#EBD9D0] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Kembali ke Daftar Menu</span>
          </button>
        </div>

        <div className="mb-5 sm:mb-8 pb-4 sm:pb-6 border-b border-[#21191A]/15 flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#710014] mb-1">
              {BUSINESS_INFO.operatingHours} · {BUSINESS_INFO.locationCity}
            </p>
            <h1 className="font-display text-2xl sm:text-5xl uppercase tracking-wide text-[#21191A]">
              CHECKOUT PESANAN
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#524346]">
            {totalQuantity} porsi dipilih · WhatsApp Resmi ({CHICKCHAU_WA_DISPLAY})
          </p>
        </div>

        {hasUnconfiguredItemInCart && (
          <div
            role="alert"
            className="mb-6 p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-400 text-[#21191A] flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="font-bold block text-[#21191A]">
                Produk Belum Tersedia:
              </strong>
              <span className="text-[#524346]">
                Beberapa produk di dalam keranjang sedang tidak tersedia atau belum memiliki harga resmi di server.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div className="bg-[#FDF8F4]/95 rounded-2xl sm:rounded-[2rem] border border-[#E2C9BE] p-4 sm:p-7 shadow-[0_14px_34px_-18px_rgba(113,0,20,0.08)]">
              <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-[#E2C9BE]">
                <h2 className="text-base sm:text-lg font-bold text-[#28191B]">
                  Daftar Pesanan ({totalQuantity} Item)
                </h2>
                <span className="text-xs font-semibold text-[#594345]">
                  CHICKCHAU
                </span>
              </div>

              <div className="space-y-4 sm:space-y-5 divide-y divide-[#E2C9BE]">
                {items.map(item => {
                  const product = item.product;
                  const hasPrice = item.unitPrice > 0;

                  return (
                    <div
                      key={product.id}
                      className="pt-4 sm:pt-5 first:pt-0 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-[#E2C9BE] bg-white">
                            <ProductVisual
                              productId={product.id}
                              size="sm"
                              className="w-full h-full"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-lg font-extrabold text-[#21191A] leading-snug break-words">
                              {product.name}
                            </h3>
                            <p className="text-xs text-[#594345] leading-relaxed mt-0.5 sm:mt-1">
                              {product.description}
                            </p>
                            <p className="text-xs font-bold text-[#710014] mt-1">
                              {hasPrice ? (
                                <>
                                  <span className="tabular-nums">{formatRupiah(item.unitPrice)}</span>
                                  <span className="mx-1">·</span>
                                  <span>per porsi</span>
                                </>
                              ) : (
                                <span className="text-[#710014] font-bold">
                                  Harga belum dikonfigurasi
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="min-h-[38px] min-w-[38px] w-9 h-9 sm:w-11 sm:h-11 p-2 text-[#594345] hover:text-[#710014] hover:bg-[#710014]/10 rounded-full transition-colors flex items-center justify-center shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                          aria-label={`Hapus ${product.name} dari keranjang`}
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 pl-0 sm:pl-[4.75rem]">
                        <div className="flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-full border border-[#8C6D6F]/45">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, item.quantity - 1)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-[#FFF7F0] text-[#28191B] flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                            aria-label={`Kurangi porsi ${product.name}`}
                          >
                            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>

                          <span className="w-6 sm:w-7 text-center text-xs sm:text-sm font-bold text-[#28191B] tabular-nums select-none">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, item.quantity + 1)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#710014] hover:bg-[#8F1025] text-white flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                            aria-label={`Tambah porsi ${product.name}`}
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="block text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#594345]">
                            Subtotal Item
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-[#28191B] tabular-nums">
                            {hasPrice ? formatRupiah(item.subtotal) : 'Rp0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#FDF8F4]/95 rounded-2xl sm:rounded-[2rem] border border-[#E2C9BE] p-4 sm:p-7 shadow-[0_14px_34px_-18px_rgba(113,0,20,0.08)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3 sm:mb-4 pb-3 border-b border-[#E2C9BE]">
                <h2 className="text-sm sm:text-base font-bold text-[#28191A]">
                  Ringkasan Biaya &amp; Pengiriman
                </h2>
                <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#710014]">
                  Discount 100% Special Offer
                </span>
              </div>

              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-[#524346]">
                  <span>Sistem Operasional</span>
                  <span className="font-bold text-[#710014]">
                    {BUSINESS_INFO.operatingHours}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#524346]">
                  <span>Area Layanan</span>
                  <span className="font-bold text-[#21191A]">
                    {BUSINESS_INFO.locationCity}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#524346]">
                  <span>Total Kuantitas</span>
                  <span className="font-bold text-[#21191A] tabular-nums">
                    {totalQuantity} item
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#524346]">
                  <span>Subtotal Produk</span>
                  <span className="font-bold text-[#21191A] tabular-nums">
                    {formatRupiah(orderSubtotal)}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#21191A]/12 space-y-1">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 text-[#21191A]">
                      <Info className="w-4 h-4 text-[#710014] shrink-0" />
                      <span className="font-semibold">Total Pengiriman</span>
                    </div>
                    {hasSelectedLocation ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through text-[#524346] font-semibold tabular-nums">
                          {formatRupiah(shippingPromo.originalShippingFee)}
                        </span>
                        <span className="font-black text-[#14532D] tabular-nums">
                          Rp0
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#710014]">
                        Pilih lokasi di peta terlebih dahulu
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#14532D] font-bold">
                    Discount 100% Special Offer
                  </p>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-[#21191A]/15 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider text-[#21191A] block">
                      Total Pembayaran
                    </span>
                    <span className="text-[11px] sm:text-xs text-[#524346]">
                      {hasSelectedLocation
                        ? 'Discount 100% Special Offer'
                        : 'Muncul setelah memilih titik lokasi pengantaran di peta'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    {hasSelectedLocation ? (
                      <>
                        <span className="block text-xs font-bold text-[#524346] line-through tabular-nums">
                          {formatRupiah(originalTotalWithShipping)}
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-[#710014] tabular-nums">
                          {formatRupiah(orderSubtotal)}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#710014]/10 text-[#710014] text-xs font-bold">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>Pilih lokasi dahulu</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-[#FDF8F4]/95 rounded-2xl sm:rounded-[2rem] border border-[#E2C9BE] p-4 sm:p-8 shadow-[0_14px_34px_-18px_rgba(113,0,20,0.08)]">
              <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-[#EBD9D0]">
                <h2 className="text-base sm:text-lg font-bold text-[#21191A]">
                  Informasi Pengantaran &amp; Titik Lokasi Bali
                </h2>
                <p className="text-xs text-[#524346] mt-1">
                  Khusus area layanan <strong>Tabanan &amp; Denpasar, Bali</strong> ({BUSINESS_INFO.operatingHours}).
                </p>
              </div>

              {errors.general && (
                <div
                  role="alert"
                  className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  <span>{errors.general}</span>
                </div>
              )}

              {checkoutNotice && (
                <div
                  role="status"
                  className={`mb-5 p-4 rounded-xl border text-xs leading-relaxed ${
                    checkoutNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : checkoutNotice.type === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2.5">
                    {checkoutNotice.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {checkoutNotice.orderId && (
                        <span className="block font-bold uppercase tracking-wider mb-0.5">
                          Referensi Pesanan: {checkoutNotice.orderId}
                        </span>
                      )}
                      <span className="font-semibold">{checkoutNotice.message}</span>
                    </div>
                  </div>

                  {checkoutNotice.waUrl && (
                    <a
                      href={checkoutNotice.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (createdOrder) {
                          void notifyWhatsAppOpened(createdOrder.orderId, createdOrder.idempotencyKey);
                        }
                      }}
                      className="min-h-[42px] inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#710014] text-white rounded-full font-bold hover:bg-[#580010] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Hubungkan ke WhatsApp ({CHICKCHAU_WA_DISPLAY})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}

              <form onSubmit={e => void handleSubmitCheckout(e)} className="space-y-4 sm:space-y-5" noValidate>
                <div id="field-fullName">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-bold uppercase tracking-wider text-[#21191A] mb-1.5"
                  >
                    Nama Lengkap <span className="text-[#710014]">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama lengkap penerima pesanan"
                    className={`w-full min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl border text-sm text-[#21191A] placeholder:text-[#594345]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] transition-colors ${
                      errors.fullName
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#21191A]/35 bg-[#FAF9F6]'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-700 font-semibold" role="alert">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div id="field-whatsappPhone">
                  <label
                    htmlFor="whatsappPhone"
                    className="block text-xs font-bold uppercase tracking-wider text-[#21191A] mb-1.5"
                  >
                    Nomor WhatsApp Pelanggan <span className="text-[#710014]">*</span>
                  </label>
                  <input
                    type="tel"
                    id="whatsappPhone"
                    name="whatsappPhone"
                    value={formData.whatsappPhone}
                    onChange={handleInputChange}
                    placeholder="Nomor WhatsApp aktif (diawali 08 atau +628)"
                    className={`w-full min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl border text-sm text-[#21191A] placeholder:text-[#594345]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] transition-colors ${
                      errors.whatsappPhone
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#21191A]/35 bg-[#FAF9F6]'
                    }`}
                  />
                  {errors.whatsappPhone && (
                    <p className="mt-1.5 text-xs text-red-700 font-semibold" role="alert">
                      {errors.whatsappPhone}
                    </p>
                  )}
                </div>

                <div id="field-googleMapsUrl" className="pt-2 pb-1 border-y border-[#21191A]/15">
                  <DeliveryMapPicker
                    onLocationSelect={handleMapLocationSelect}
                  />
                  {errors.googleMapsUrl && (
                    <p className="mt-2 text-xs text-red-700 font-semibold" role="alert">
                      {errors.googleMapsUrl}
                    </p>
                  )}
                </div>

                <div id="field-deliveryAddress">
                  <label
                    htmlFor="deliveryAddress"
                    className="block text-xs font-bold uppercase tracking-wider text-[#21191A] mb-1.5"
                  >
                    Alamat Lengkap Pengantaran <span className="text-[#710014]">*</span>
                  </label>
                  <textarea
                    id="deliveryAddress"
                    name="deliveryAddress"
                    rows={3}
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    placeholder="Tuliskan nama jalan, nomor bangunan, RT/RW, kelurahan, dan patokan lokasi"
                    className={`w-full px-3.5 sm:px-4 py-2.5 rounded-xl border text-sm text-[#21191A] placeholder:text-[#594345]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] transition-colors resize-none ${
                      errors.deliveryAddress
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#21191A]/35 bg-[#FAF9F6]'
                    }`}
                  />
                  {errors.deliveryAddress && (
                    <p className="mt-1.5 text-xs text-red-700 font-semibold" role="alert">
                      {errors.deliveryAddress}
                    </p>
                  )}
                </div>

                <div id="field-notes">
                  <label
                    htmlFor="notes"
                    className="block text-xs font-bold uppercase tracking-wider text-[#21191A] mb-1.5"
                  >
                    Catatan Tambahan <span className="text-[#594345] font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Keterangan tambahan pesanan (opsional)"
                    className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#21191A]/35 bg-[#FAF9F6] text-sm text-[#21191A] placeholder:text-[#594345]/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] transition-colors resize-none"
                  />
                  {errors.notes && (
                    <p className="mt-1.5 text-xs text-red-700 font-semibold" role="alert">
                      {errors.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={!canCheckout || isSubmitting}
                    className={`w-full min-h-[48px] sm:min-h-[52px] py-3 sm:py-3.5 px-5 sm:px-6 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] ${
                      !canCheckout || isSubmitting
                        ? 'bg-[#EBD9D0] text-[#594345] cursor-not-allowed'
                        : 'bg-[#710014] hover:bg-[#8F1025] text-white cursor-pointer shadow-[0_12px_28px_-8px_rgba(113,0,20,0.45)]'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>
                      {isSubmitting
                        ? 'MENGHUBUNGKAN KE WHATSAPP...'
                        : `PESAN VIA WHATSAPP (${CHICKCHAU_WA_DISPLAY})`}
                    </span>
                  </button>

                  <p className="text-[11px] sm:text-xs text-center text-[#594345]">
                    Terhubung langsung ke{' '}
                    <a
                      href={CHICKCHAU_WA_BASE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#710014] underline underline-offset-2 hover:text-[#8F1025]"
                    >
                      wa.me/628112199334 ({CHICKCHAU_WA_DISPLAY})
                    </a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
