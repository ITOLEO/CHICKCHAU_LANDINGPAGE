import React, { useEffect } from 'react';
import { Plus, Minus, ShoppingCart, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah, isPriceConfigured } from '../utils/formatters';
import { ProductVisual } from './ProductVisuals';
import { Product, BUSINESS_INFO } from '../data/products';
import { trackViewItemList } from '../utils/analytics';

export const ProductSection: React.FC = () => {
  const { products, getItemQuantity, addToCart, updateQuantity } = useCart();

  useEffect(() => {
    trackViewItemList(products);
  }, [products]);

  return (
    <section id="produk" className="py-10 sm:py-14 lg:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-[#710014] leading-none">
              PILIH MENU FAVORITMU
            </h2>
            <span
              aria-hidden="true"
              className="w-12 sm:w-16 h-[2px] bg-[#710014]/55 inline-block rounded-full"
            />
          </div>

          <p className="text-xs sm:text-sm text-[#594345] font-medium">
            {BUSINESS_INFO.operatingHours} · Area {BUSINESS_INFO.locationCity}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {products.map((product: Product) => {
            const quantity = getItemQuantity(product.id);
            const hasValidPrice = isPriceConfigured(product.defaultPrice);

            return (
              <article
                key={product.id}
                className="h-full rounded-[2rem] bg-[#FDF8F4]/95 border border-[#E2C9BE] p-6 sm:p-7 shadow-[0_16px_38px_-18px_rgba(113,0,20,0.09)] hover:shadow-[0_20px_44px_-16px_rgba(113,0,20,0.14)] transition-shadow flex flex-col sm:flex-row items-center sm:items-stretch gap-5 sm:gap-6"
              >
                <div className="relative w-36 sm:w-40 h-48 sm:h-56 shrink-0 self-center flex items-center justify-center">
                  <div
                    aria-hidden="true"
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-[#28191B]/18 blur-md rounded-full"
                  />
                  <ProductVisual
                    productId={product.id}
                    size="lg"
                    className="w-full h-full"
                    imgClassName="max-h-full w-auto object-contain transition-transform duration-300 hover:scale-[1.03]"
                  />
                </div>

                <div className="flex-1 min-w-0 w-full flex flex-col text-center sm:text-left">
                  <div className="sm:min-h-[2.25rem] flex flex-col justify-start">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#28191B] leading-tight">
                      {product.name}
                      {product.shortName !== product.name && (
                        <span className="block text-base sm:text-lg font-extrabold text-[#710014] mt-0.5">
                          ({product.shortName})
                        </span>
                      )}
                    </h3>
                  </div>

                  <p className="text-sm text-[#594345] leading-relaxed mt-2 sm:h-[4.25rem] line-clamp-3">
                    {product.description}
                  </p>

                  <div className="mt-3 mb-4 h-9 flex items-center justify-center sm:justify-start">
                    {hasValidPrice ? (
                      <span className="text-2xl sm:text-[1.7rem] font-black text-[#710014] tabular-nums leading-none">
                        {formatRupiah(product.defaultPrice)}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-[#710014] text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Harga Belum Ditentukan</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1 flex items-center justify-center sm:justify-start gap-2.5 flex-nowrap">
                    <div className="h-11 inline-flex items-center gap-1 bg-white p-1 rounded-full border border-[#8C6D6F]/45 shadow-[0_2px_8px_rgba(40,25,27,0.04)] shrink-0">
                      <button
                        type="button"
                        disabled={!hasValidPrice || quantity === 0}
                        onClick={() => updateQuantity(product.id, Math.max(0, quantity - 1))}
                        className="w-9 h-9 rounded-full hover:bg-[#FFF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-[#28191B] flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Kurangi porsi ${product.name}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span
                        className="min-w-[24px] text-center text-sm font-extrabold text-[#28191B] tabular-nums select-none"
                        aria-label={`Jumlah ${product.name} di keranjang: ${quantity}`}
                      >
                        {quantity}
                      </span>

                      <button
                        type="button"
                        disabled={!hasValidPrice}
                        onClick={() =>
                          quantity === 0
                            ? addToCart(product.id)
                            : updateQuantity(product.id, quantity + 1)
                        }
                        className="w-9 h-9 rounded-full hover:bg-[#FFF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-[#710014] flex items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Tambah porsi ${product.name}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {!hasValidPrice ? (
                      <button
                        type="button"
                        disabled
                        className="h-11 px-4 sm:px-5 rounded-full bg-[#EBD9D0] text-[#594345] text-xs font-bold cursor-not-allowed whitespace-nowrap shrink-0"
                        title="Produk belum dapat dipesan karena harga belum dikonfigurasi"
                      >
                        Belum Tersedia
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        className="h-11 px-4 sm:px-5 rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-[0.98] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(113,0,20,0.45)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                        aria-label={`Tambah ${product.name} ke keranjang`}
                      >
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                        <span>{quantity > 0 ? `Tambah (${quantity})` : 'Tambah'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
