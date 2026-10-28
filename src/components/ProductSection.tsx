import React, { useEffect } from 'react';
import { Plus, Minus, ShoppingCart, AlertCircle, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah, isPriceConfigured } from '../utils/formatters';
import { ProductVisual } from './ProductVisuals';
import { Product, BUSINESS_INFO } from '../data/products';
import { trackViewItemList } from '../utils/analytics';

interface ProductSectionProps {
  onGoToCart?: () => void;
}

export const ProductSection: React.FC<ProductSectionProps> = ({ onGoToCart }) => {
  const { products, totalQuantity, orderSubtotal, getItemQuantity, addToCart, updateQuantity } = useCart();

  useEffect(() => {
    trackViewItemList(products);
  }, [products]);

  return (
    <section id="produk" className="py-6 sm:py-14 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 sm:mb-10 gap-2 sm:gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <h2 className="font-display text-xl sm:text-3xl uppercase tracking-wide text-[#710014] leading-none">
              PILIH MENU FAVORITMU
            </h2>
            <span
              aria-hidden="true"
              className="w-8 sm:w-16 h-[2px] bg-[#710014]/55 inline-block rounded-full"
            />
          </div>

          <p className="text-[11px] sm:text-sm text-[#594345] font-medium">
            {BUSINESS_INFO.operatingHours} · Area {BUSINESS_INFO.locationCity}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          {products.map((product: Product) => {
            const quantity = getItemQuantity(product.id);
            const hasValidPrice = isPriceConfigured(product.defaultPrice);
            const isComingSoon = Boolean(product.comingSoon) || !product.available;
            const canOrderProduct = !isComingSoon && hasValidPrice;

            return (
              <article
                key={product.id}
                className="h-full rounded-2xl sm:rounded-[2rem] bg-[#FDF8F4]/95 border border-[#E2C9BE] p-4 sm:p-7 shadow-[0_14px_34px_-18px_rgba(113,0,20,0.09)] hover:shadow-[0_20px_44px_-16px_rgba(113,0,20,0.14)] transition-shadow flex flex-row items-center sm:items-stretch gap-3.5 sm:gap-6"
              >
                <div className="relative w-24 sm:w-40 h-32 sm:h-56 shrink-0 self-center flex items-center justify-center">
                  <div
                    aria-hidden="true"
                    className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 w-18 sm:w-28 h-3 sm:h-4 bg-[#28191B]/18 blur-md rounded-full"
                  />
                  <ProductVisual
                    productId={product.id}
                    size="lg"
                    className="w-full h-full"
                    imgClassName={`max-h-full w-auto object-contain transition-transform duration-300 ${
                      isComingSoon ? 'opacity-70 grayscale-[20%]' : 'hover:scale-[1.03]'
                    }`}
                  />
                  {isComingSoon && (
                    <div className="pointer-events-none select-none absolute inset-x-1 top-1/2 -translate-y-1/2 flex justify-center">
                      <span className="px-2.5 py-1 rounded-md bg-[#28191B]/90 text-[#FFF7F0] text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-center shadow-md">
                        Coming Soon
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 w-full flex flex-col text-left">
                  <div className="min-h-[1.75rem] sm:min-h-[2.25rem] flex flex-col justify-start">
                    <h3 className="text-base sm:text-2xl font-extrabold text-[#28191B] leading-tight">
                      {product.name}
                      {product.shortName !== product.name && (
                        <span className="block text-sm sm:text-lg font-extrabold text-[#710014] mt-0.5">
                          ({product.shortName})
                        </span>
                      )}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-[#594345] leading-relaxed mt-1 sm:mt-2 min-h-[3.1rem] sm:h-[4.25rem] line-clamp-3">
                    {product.description}
                  </p>

                  <div className="mt-2 sm:mt-3 mb-2.5 sm:mb-4 h-7 sm:h-9 flex items-center justify-start gap-2">
                    {isComingSoon ? (
                      <span className="text-sm sm:text-lg font-extrabold uppercase tracking-wide text-[#710014] leading-none">
                        Coming Soon
                      </span>
                    ) : hasValidPrice ? (
                      <span className="text-lg sm:text-[1.7rem] font-black text-[#710014] tabular-nums leading-none">
                        {formatRupiah(product.defaultPrice)}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-[#710014] text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Harga Belum Ditentukan</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1 flex items-center justify-start gap-2 sm:gap-2.5 flex-nowrap">
                    <div
                      className={`h-9 sm:h-11 inline-flex items-center gap-0.5 sm:gap-1 bg-white p-0.5 sm:p-1 rounded-full border border-[#8C6D6F]/45 shadow-[0_2px_8px_rgba(40,25,27,0.04)] shrink-0 ${
                        !canOrderProduct ? 'opacity-50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!canOrderProduct || quantity === 0}
                        onClick={() => updateQuantity(product.id, Math.max(0, quantity - 1))}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-[#FFF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-[#28191B] flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Kurangi porsi ${product.name}`}
                      >
                        <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <span
                        className="min-w-[20px] sm:min-w-[24px] text-center text-xs sm:text-sm font-extrabold text-[#28191B] tabular-nums select-none"
                        aria-label={`Jumlah ${product.name} di keranjang: ${quantity}`}
                      >
                        {isComingSoon ? 0 : quantity}
                      </span>

                      <button
                        type="button"
                        disabled={!canOrderProduct}
                        onClick={() =>
                          quantity === 0
                            ? addToCart(product.id)
                            : updateQuantity(product.id, quantity + 1)
                        }
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-[#FFF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-[#710014] flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Tambah porsi ${product.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {isComingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="h-9 sm:h-11 px-3.5 sm:px-5 rounded-full bg-[#EBD9D0] text-[#594345] text-xs sm:text-sm font-extrabold cursor-not-allowed whitespace-nowrap shrink-0"
                        title="Crispy Chickchau segera hadir dan belum dapat dipesan sementara"
                      >
                        Coming Soon
                      </button>
                    ) : !hasValidPrice ? (
                      <button
                        type="button"
                        disabled
                        className="h-9 sm:h-11 px-3 sm:px-5 rounded-full bg-[#EBD9D0] text-[#594345] text-xs font-bold cursor-not-allowed whitespace-nowrap shrink-0"
                        title="Produk belum dapat dipesan karena harga belum dikonfigurasi"
                      >
                        Belum Tersedia
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        className="h-9 sm:h-11 px-3.5 sm:px-5 rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-[0.98] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(113,0,20,0.45)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Tambah ${product.name} ke keranjang`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{quantity > 0 ? `Tambah (${quantity})` : 'Tambah'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {onGoToCart && (
          <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#FDF8F4] border border-[#E2C9BE] shadow-[0_10px_28px_-16px_rgba(113,0,20,0.12)]">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#710014]/10 text-[#710014] flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#28191B]">
                    {totalQuantity > 0
                      ? `${totalQuantity} Porsi di Keranjang (${formatRupiah(orderSubtotal)})`
                      : 'Sudah pilih porsi favoritmu?'}
                  </p>
                  <p className="text-[11px] sm:text-xs text-[#594345]">
                    Lanjutkan ke halaman Checkout untuk memilih titik lokasi pengantaran &amp; konfirmasi WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoToCart}
              className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_10px_24px_-8px_rgba(113,0,20,0.45)] transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Lanjut ke Checkout ({totalQuantity})</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
