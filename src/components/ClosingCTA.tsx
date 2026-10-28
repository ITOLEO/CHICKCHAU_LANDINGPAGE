import React from 'react';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ClosingCTAProps {
  onOrderNow: () => void;
  onGoToCart: () => void;
}

export const ClosingCTA: React.FC<ClosingCTAProps> = ({ onGoToCart }) => {
  const { totalQuantity } = useCart();

  return (
    <section className="py-5 sm:py-14 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl sm:rounded-[3.5rem] bg-gradient-to-r from-[#5C0818] via-[#710014] to-[#8A0E23] px-5 py-6 sm:px-14 sm:py-13 shadow-[0_24px_50px_-20px_rgba(113,0,20,0.45)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 1200 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-30"
            preserveAspectRatio="none"
          >
            <path
              d="M0 40C260 -20 480 95 760 45C980 5 1120 -10 1200 25V280H0V40Z"
              fill="#8F1025"
            />
            <path
              d="M0 220C310 265 620 155 940 210C1080 234 1155 245 1200 230V280H0V220Z"
              fill="#3D0610"
            />
          </svg>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-8">
            <div className="flex items-start gap-2.5 sm:gap-5 max-w-xl">
              <svg
                aria-hidden="true"
                viewBox="0 0 48 48"
                fill="none"
                className="w-6 sm:w-10 h-auto shrink-0 -mt-0.5 text-[#FFF7F0]"
              >
                <path
                  d="M34 18L28 4"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M26 26L10 14"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M22 36L6 34"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>

              <div>
                <h2 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.12] mb-1.5 sm:mb-2.5">
                  Siap Pesan Untuk Hari Ini?
                </h2>
                <p className="text-xs sm:text-base text-[#FFF7F0]/95 leading-relaxed">
                  Tentukan jumlah porsi Chikchau Capcin (Rp8.000) dan Crispy Chickchau (Rp30.000) untuk jadwal pengantaran Sistem Pre-Order (Minimal H-1) di area Tabanan &amp; Denpasar, Bali.
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={onGoToCart}
                className="w-full md:w-auto min-h-[46px] sm:min-h-[54px] px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full bg-white hover:bg-[#FFF7F0] active:scale-[0.99] text-[#28191B] font-extrabold text-xs sm:text-base transition-all inline-flex items-center justify-center gap-2.5 shadow-[0_12px_28px_rgba(25,10,12,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#710014] shrink-0" />
                <span>
                  {totalQuantity > 0
                    ? `Checkout & Order via WhatsApp (${totalQuantity})`
                    : 'Checkout & Order via WhatsApp'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#28191B] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
