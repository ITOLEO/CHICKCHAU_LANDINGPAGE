import React from 'react';

export const BrandIntro: React.FC = () => {
  return (
    <section className="py-3 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-gradient-to-r from-[#3A0711] via-[#540917] to-[#680B1C] text-white px-5 py-5 sm:px-12 sm:py-11 shadow-[0_22px_48px_-22px_rgba(69,10,22,0.5)]">
          <img
            src="/logo-mark.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-4 -bottom-6 w-40 sm:w-72 md:w-80 h-auto opacity-15 object-contain"
          />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 md:gap-10 items-center">
            <div className="md:col-span-5 md:border-r md:border-white/20 md:pr-8">
              <div className="flex items-center gap-2.5 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.16em] text-[#F8E5D8] mb-1.5 sm:mb-3">
                <span>TENTANG CHICKCHAU</span>
                <span
                  aria-hidden="true"
                  className="w-8 sm:w-10 h-[1.5px] bg-[#F8E5D8]/45 inline-block"
                />
              </div>
              <h2 className="font-display text-2xl sm:text-[clamp(2.2rem,4.2vw,3.35rem)] tracking-tight uppercase text-white leading-[0.95]">
                <span className="inline sm:block">GOOD FOOD. </span>
                <span className="inline sm:block">GOOD MOOD.</span>
              </h2>
            </div>

            <div className="md:col-span-7 max-w-xl space-y-2 sm:space-y-3.5">
              <p className="text-xs sm:text-base text-[#FFF7F0]/95 leading-relaxed">
                CHICKCHAU menghadirkan paduan kuliner Crispy Chickchau yang digoreng renyah dan Chikchau Capcin dingin yang menyegarkan untuk menemani waktu istirahat maupun kumpul bersama teman.
              </p>
              <p className="text-xs sm:text-base text-[#F8E5D8] font-medium">
                Seluruh porsi disiapkan segar sesuai pesanan melalui Sistem Pre-Order (Minimal H-1) untuk pengantaran area Tabanan &amp; Denpasar, Bali.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
