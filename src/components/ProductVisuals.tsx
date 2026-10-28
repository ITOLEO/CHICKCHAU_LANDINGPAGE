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
  const src = isShihlin
    ? '/assets/aistudio/chickchau_since2026_1fc0b186.png'
    : '/assets/aistudio/CHICKHAUCINCAU2026_0435b65d.png';
  const altText = isShihlin
    ? 'Crispy Chickchau dalam kemasan paper bag CHICKCHAU'
    : 'Chikchau Capcin CHICKCHAU';

  const paddingClass =
    size === 'sm' ? 'p-1' : size === 'md' ? 'p-1.5' : 'p-1.5 sm:p-2';

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${paddingClass} ${className}`}
    >
      <img
        src={src}
        alt={altText}
        loading="eager"
        className={`w-full h-full object-contain mix-blend-multiply ${imgClassName}`}
      />
    </div>
  );
};
