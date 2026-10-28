import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  currentRoute: 'home' | 'cart';
  onNavigate: (route: 'home' | 'cart', targetId?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate
}) => {
  const { totalQuantity } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFF7F0]/95 backdrop-blur-md border-b border-[#EBD9D0]/60 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigate('home', 'top')}
          className="font-display text-base sm:text-2xl tracking-wider text-[#710014] transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 min-h-[40px] sm:min-h-[44px] flex items-center gap-2 sm:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] rounded-xl"
          aria-label="Beranda CHICKCHAU"
        >
          <span className="w-8 h-8 sm:w-11 sm:h-11 bg-[#710014] rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(113,0,20,0.2)]">
            <img
              src="/logo-mark.svg"
              alt=""
              className="h-4 sm:h-6 w-auto block"
            />
          </span>
          <span className="tracking-wide">CHICKCHAU</span>
        </button>

        <nav className="flex items-center gap-1 sm:gap-6" aria-label="Navigasi Utama">
          <button
            type="button"
            onClick={() => onNavigate('home', 'top')}
            className={`relative min-h-[38px] sm:min-h-[44px] px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] rounded-lg ${
              currentRoute === 'home'
                ? 'text-[#710014] after:content-[""] after:absolute after:left-2 after:right-2 after:bottom-1 after:h-[2px] after:bg-[#710014] after:rounded-full'
                : 'text-[#28191B] hover:text-[#710014]'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home', 'produk')}
            className="min-h-[38px] sm:min-h-[44px] px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-bold text-[#710014]/85 hover:text-[#710014] transition-colors whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          >
            Produk
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className={`min-h-[38px] sm:min-h-[44px] px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] ${
              currentRoute === 'cart' || totalQuantity > 0
                ? 'bg-[#710014] hover:bg-[#8F1025] text-white shadow-[0_6px_18px_rgba(113,0,20,0.28)]'
                : 'bg-white text-[#710014] border border-[#710014]/35 hover:border-[#710014] shadow-[0_4px_14px_rgba(40,25,27,0.06)]'
            }`}
            aria-label={`Checkout Keranjang belanja, ${totalQuantity} item`}
          >
            <ShoppingCart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                currentRoute === 'cart' || totalQuantity > 0 ? 'text-white' : 'text-[#710014]'
              }`}
            />
            <span>Checkout</span>
            <span
              className={`min-w-[20px] h-[20px] sm:min-w-[22px] sm:h-[22px] px-1.5 rounded-full text-[11px] sm:text-xs font-extrabold tabular-nums flex items-center justify-center ${
                currentRoute === 'cart' || totalQuantity > 0
                  ? 'bg-white text-[#710014]'
                  : 'bg-[#710014] text-white'
              }`}
            >
              {totalQuantity}
            </span>
            <ArrowRight className="hidden sm:inline-block w-3.5 h-3.5 shrink-0 opacity-90" />
          </button>
        </nav>
      </div>
    </header>
  );
};
