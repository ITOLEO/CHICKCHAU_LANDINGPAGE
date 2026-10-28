import React from 'react';

interface ProductVisualProps {
  productId: 'capcin' | 'shihlin';
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProductVisual: React.FC<ProductVisualProps> = ({
  productId,
  className = '',
  imgClassName = '',
  size = 'lg'
}) => {
  const isShihlin = productId === 'shihlin';
  const src = isShihlin ? '/assets/shihlin_white.png' : '/assets/capcin_white.png';
  const altText = isShihlin
    ? 'Crispy Chickchau dalam kemasan paper bag CHICKCHAU'
    : 'Chikchau Capcin CHICKCHAU';

  const paddingClass =
    size === 'sm' ? 'p-1' : size === 'md' ? 'p-2' : 'p-2 sm:p-3';

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${paddingClass} ${className}`}
    >
      <img
        src={src}
        alt={altText}
        loading="eager"
        className={`w-full h-full object-contain drop-shadow-[0_16px_20px_rgba(40,25,27,0.2)] ${imgClassName}`}
      />
    </div>
  );
};
