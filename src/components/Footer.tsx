import React from 'react';
import { MessageCircle } from 'lucide-react';
import { BUSINESS_INFO } from '../data/products';

interface FooterProps {
  onNavigate: (route: 'home' | 'cart', targetId?: string) => void;
  onOpenPriceConfig?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#540917] text-[#FFF7F0] pt-7 pb-24 sm:pt-10 sm:pb-16 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-8 pb-6 sm:pb-8 border-b border-white/15">
          <div className="flex items-center gap-3">
            <img
              src="/logo-mark.svg"
              alt="CHICKCHAU logo mark"
              className="h-10 sm:h-12 w-auto block shrink-0"
            />
            <div>
              <div className="font-display text-lg sm:text-2xl tracking-wider text-white leading-none">
                {BUSINESS_INFO.name}
              </div>
              <p className="text-xs sm:text-sm text-[#F8E5D8] mt-1">
                {BUSINESS_INFO.tagline}
              </p>
            </div>
          </div>

          <nav
            aria-label="Navigasi Footer"
            className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-[#FFF7F0]"
          >
            <button
              type="button"
              onClick={() => onNavigate('home', 'top')}
              className="min-h-[40px] sm:min-h-[44px] px-2 hover:text-white hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm"
            >
              Home
            </button>
            <span aria-hidden="true" className="h-4 w-[1px] bg-white/25" />
            <button
              type="button"
              onClick={() => onNavigate('home', 'produk')}
              className="min-h-[40px] sm:min-h-[44px] px-2 hover:text-white hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm"
            >
              Produk
            </button>
            <span aria-hidden="true" className="h-4 w-[1px] bg-white/25" />
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              className="min-h-[40px] sm:min-h-[44px] px-2 font-bold hover:text-white hover:underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-sm"
            >
              Checkout
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/${BUSINESS_INFO.whatsappInternational}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Hubungi WhatsApp resmi CHICKCHAU ${BUSINESS_INFO.whatsappNumber}`}
              className="min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{BUSINESS_INFO.whatsappNumber}</span>
            </a>
          </div>
        </div>

        <div className="pt-5 sm:pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs text-[#F8E5D8]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{BUSINESS_INFO.operatingHours}</span>
            <span aria-hidden="true">·</span>
            <span>Area Layanan: {BUSINESS_INFO.locationCity}</span>
          </div>
          <p>© {new Date().getFullYear()} {BUSINESS_INFO.name}. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
};
