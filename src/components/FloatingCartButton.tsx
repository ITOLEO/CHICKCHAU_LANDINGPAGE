import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatRupiah } from '../utils/formatters';

interface FloatingCartButtonProps {
  currentRoute: 'home' | 'cart';
  onOpenCart: () => void;
}

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  currentRoute,
  onOpenCart
}) => {
  const { totalQuantity, orderSubtotal } = useCart();

  if (currentRoute === 'cart') {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 pointer-events-none flex justify-center sm:justify-end">
      {totalQuantity > 0 ? (
        <button
          type="button"
          onClick={onOpenCart}
          className="pointer-events-auto w-full max-w-md sm:w-auto sm:min-w-[320px] min-h-[52px] px-4 sm:px-5 py-2.5 rounded-2xl sm:rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-[0.99] text-white shadow-[0_14px_34px_rgba(40,25,27,0.38)] border border-white/20 transition-all flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          aria-label={`Checkout Sekarang: ${totalQuantity} item, subtotal ${formatRupiah(orderSubtotal)}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-white text-[#710014] text-xs font-black flex items-center justify-center shrink-0 tabular-nums shadow-xs">
              {totalQuantity}
            </span>
            <div className="text-left leading-tight truncate">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#F8E5D8]">
                Siap Checkout
              </span>
              <span className="block text-sm font-black text-white tabular-nums truncate">
                {formatRupiah(orderSubtotal)}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#710014] text-xs sm:text-sm font-extrabold shrink-0 shadow-xs">
            <span>Checkout</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenCart}
          className="pointer-events-auto ml-auto min-h-[46px] px-4 py-2.5 rounded-full bg-[#710014] hover:bg-[#8F1025] active:scale-95 text-white shadow-[0_12px_28px_rgba(40,25,27,0.3)] border border-white/20 transition-all flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          aria-label="Buka Halaman Checkout & Keranjang"
        >
          <ShoppingCart className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold tracking-wide">Checkout</span>
          <span className="min-w-[20px] h-5 px-1.5 bg-white text-[#710014] text-[11px] font-black rounded-full flex items-center justify-center tabular-nums">
            0
          </span>
        </button>
      )}
    </div>
  );
};
