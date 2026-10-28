import React from 'react';
import { ShoppingCart } from 'lucide-react';
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
    <header className="sticky top-0 z-40 w-full bg-[#FFF7F0]/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('home', 'top')}
          className="font-display text-xl sm:text-2xl tracking-wider text-[#710014] transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 min-h-[44px] flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] rounded-xl"
          aria-label="Beranda CHICKCHAU"
        >
          <span className="w-11 h-11 bg-[#710014] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(113,0,20,0.2)]">
            <img
              src="/logo-mark.svg"
              alt=""
              className="h-6 w-auto block"
            />
          </span>
          <span className="tracking-wide">CHICKCHAU</span>
        </button>

        <nav className="flex items-center gap-2 sm:gap-7" aria-label="Navigasi Utama">
          <button
            type="button"
            onClick={() => onNavigate('home', 'top')}
            className={`relative min-h-[44px] px-2.5 py-2 text-sm font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] rounded-lg ${
              currentRoute === 'home'
                ? 'text-[#710014] after:content-[""] after:absolute after:left-2.5 after:right-2.5 after:bottom-1.5 after:h-[2.5px] after:bg-[#710014] after:rounded-full'
                : 'text-[#28191B] hover:text-[#710014]'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home', 'produk')}
            className="min-h-[44px] px-2.5 py-2 text-sm font-bold text-[#710014]/85 hover:text-[#710014] transition-colors whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          >
            Produk
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014] ${
              currentRoute === 'cart'
                ? 'bg-[#710014] text-white shadow-[0_6px_18px_rgba(113,0,20,0.25)]'
                : 'bg-white text-[#710014] border border-[#EBD9D0] hover:border-[#710014]/40 shadow-[0_4px_14px_rgba(40,25,27,0.06)]'
            }`}
            aria-label={`Keranjang belanja, ${totalQuantity} item`}
          >
            <ShoppingCart
              className={`w-4 h-4 shrink-0 ${
                currentRoute === 'cart' ? 'text-white' : 'text-[#710014]'
              }`}
            />
            <span>Keranjang</span>
            <span
              className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-extrabold tabular-nums flex items-center justify-center ${
                currentRoute === 'cart'
                  ? 'bg-white text-[#710014]'
                  : 'bg-[#710014] text-white'
              }`}
            >
              {totalQuantity}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
