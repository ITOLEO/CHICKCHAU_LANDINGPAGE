import React from 'react';
import { ShoppingCart } from 'lucide-react';
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
    <div className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-30">
      <button
        type="button"
        onClick={onOpenCart}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white hover:bg-[#FFF7F0] active:scale-95 text-[#710014] shadow-[0_12px_32px_rgba(40,25,27,0.28)] border border-[#EBD9D0] transition-all flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
        aria-label={
          totalQuantity > 0
            ? `Buka Keranjang: ${totalQuantity} item, subtotal ${formatRupiah(orderSubtotal)}`
            : 'Buka Keranjang Belanja'
        }
      >
        <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-[#710014]" />
        {totalQuantity > 0 && (
          <span className="-top-1.5 -right-1.5 absolute min-w-[24px] h-6 px-1.5 bg-[#710014] text-white text-xs font-extrabold rounded-full border-2 border-white flex items-center justify-center tabular-nums shadow-sm">
            {totalQuantity}
          </span>
        )}
      </button>
    </div>
  );
};
