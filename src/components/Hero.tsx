import React from 'react';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { BUSINESS_INFO } from '../data/products';
import { useCart } from '../context/CartContext';

interface HeroProps {
  onScrollToProducts: () => void;
  onGoToCart?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToProducts, onGoToCart }) => {
  const { totalQuantity } = useCart();

  return (
    <section
      id="top"
      className="relative pt-3 pb-7 sm:pt-8 sm:pb-16 lg:pt-10 lg:pb-20 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 -z-10 overflow-hidden"
      >
        <svg
          viewBox="0 0 1440 760"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          <path
            d="M-80 620C220 510 470 330 780 90C1020 -95 1290 -40 1520 60V760H-80V620Z"
            fill="#F8E5D8"
            fillOpacity="0.55"
          />
          <path
            d="M-100 680C260 660 540 500 920 530C1190 550 1350 640 1540 600V760H-100V680Z"
            fill="#F3D8C6"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-6 items-center">
          <div className="lg:col-span-6 z-10">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-sm font-extrabold uppercase tracking-wider text-[#710014] mb-2.5 sm:mb-5">
              <span>{BUSINESS_INFO.name}</span>
              <span
                aria-hidden="true"
                className="w-5 sm:w-7 h-[1.5px] bg-[#710014]/60 inline-block"
              />
              <span>CRISPY BITES, CREAMY SIPS.</span>
            </div>

            <h1 className="font-display text-[clamp(2.15rem,8vw,5.15rem)] tracking-[-0.02em] uppercase leading-[0.94] mb-3 sm:mb-6 text-balance">
              <span className="block text-[#28191B]">CRISPY</span>
              <span className="block text-[#28191B]">BITES,</span>
              <span className="block text-[#710014]">CREAMY SIPS.</span>
            </h1>

            <p className="text-xs sm:text-lg text-[#3D292B] leading-relaxed mb-2.5 sm:mb-4 max-w-md font-normal">
              Nikmati kelezatan Crispy Chickchau dan Chikchau Capcin dari CHICKCHAU. Dibuat segar setiap hari dengan sistem pre-order minimal H-1 untuk pengantaran area Tabanan &amp; Denpasar, Bali.
            </p>

            <p className="text-[11px] sm:text-sm font-semibold text-[#594345] mb-4 sm:mb-8 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[#710014] font-bold">{BUSINESS_INFO.operatingHours}</span>
              <span aria-hidden="true">·</span>
              <span>Area Layanan: {BUSINESS_INFO.locationCity}</span>
            </p>

            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2.5 sm:gap-4">
              <button
                type="button"
                onClick={onScrollToProducts}
                className="min-h-[44px] sm:min-h-[50px] px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-[0.99] text-white text-xs sm:text-base font-bold transition-all inline-flex items-center justify-center gap-2 sm:gap-3 shadow-[0_12px_28px_-8px_rgba(113,0,20,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
              >
                <span>Pesan Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>

              {onGoToCart ? (
                <button
                  type="button"
                  onClick={onGoToCart}
                  className="min-h-[44px] sm:min-h-[50px] px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full bg-white hover:bg-[#FFF7F0] active:scale-[0.99] text-[#710014] text-xs sm:text-base font-extrabold border-2 border-[#710014] transition-all inline-flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(113,0,20,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                >
                  <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Checkout ({totalQuantity})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onScrollToProducts}
                  className="min-h-[44px] sm:min-h-[50px] px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-full bg-[#FFF7F0]/80 hover:bg-white active:scale-[0.99] text-[#710014] text-xs sm:text-base font-bold border border-[#710014]/55 hover:border-[#710014] transition-all inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
                >
                  Lihat Daftar Menu
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[210px] sm:min-h-[400px] lg:min-h-[470px] overflow-hidden sm:overflow-visible rounded-3xl sm:rounded-none">
            <svg
              aria-hidden="true"
              viewBox="0 0 640 560"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 m-auto sm:inset-auto sm:-right-12 lg:-right-16 sm:top-1/2 sm:-translate-y-1/2 w-[96%] sm:w-[110%] h-auto max-w-none pointer-events-none select-none"
            >
              <path
                d="M178.5 88.2C264.8 18.6 402.4 -18.4 514.2 14.8C626 48 672.5 168.4 624.8 274.6C577.1 380.8 456.4 428.5 341.2 468.2C226 507.9 102.3 532.4 54.6 462.8C6.9 393.2 92.2 157.8 178.5 88.2Z"
                fill="#710014"
              />
              <path
                d="M235 64C325 5 455 -8 548 32C610 59 638 132 602 212C566 292 470 330 372 365C274 400 165 420 128 362C91 304 145 123 235 64Z"
                fill="#8F1025"
                fillOpacity="0.45"
              />
            </svg>

            <svg
              aria-hidden="true"
              viewBox="0 0 64 56"
              fill="none"
              className="absolute top-3 sm:top-10 left-[18%] sm:left-[26%] w-7 sm:w-11 h-auto z-20 pointer-events-none select-none"
            >
              <path
                d="M12 36L18 10"
                stroke="#FFF7F0"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M26 40L42 16"
                stroke="#FFF7F0"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M36 48L56 36"
                stroke="#FFF7F0"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>

            <svg
              aria-hidden="true"
              viewBox="0 0 54 64"
              fill="none"
              className="absolute bottom-6 sm:bottom-20 right-2 sm:right-3 w-6 sm:w-10 h-auto z-20 pointer-events-none select-none"
            >
              <path
                d="M8 22L30 8"
                stroke="#710014"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M10 36L38 34"
                stroke="#710014"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              <path
                d="M8 48L34 56"
                stroke="#710014"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>

            <div className="relative z-10 w-full flex items-center justify-center py-2 sm:py-4">
              <button
                type="button"
                onClick={onScrollToProducts}
                aria-label="Lihat daftar menu CHICKCHAU"
                className="group relative bg-transparent border-0 p-0 transition-transform duration-300 hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFF7F0] rounded-[1.75rem] sm:rounded-[2.25rem] cursor-pointer"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 w-[72%] h-5 sm:h-6 bg-[#1E0E10]/45 blur-lg rounded-full"
                />
                <img
                  src="/assets/aistudio/image_5b8350a4.png"
                  alt="CHICKCHAU Since 2026"
                  width={227}
                  height={238}
                  className="relative w-40 sm:w-64 lg:w-72 h-auto object-contain select-none rounded-[1.6rem] sm:rounded-[2.1rem] shadow-[0_18px_36px_rgba(30,14,16,0.45)]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
