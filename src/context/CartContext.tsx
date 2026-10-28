import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { BASE_PRODUCTS, Product, ProductId } from '../data/products';
import { isPriceConfigured } from '../utils/formatters';
import { CartItemDetailed } from '../utils/whatsapp';
import {
  trackAddToCart,
  trackRemoveFromCart,
  trackSelectItem
} from '../utils/analytics';

const CART_STORAGE_KEY = 'chickchau_cart_v2';

interface CartStorageMap {
  [productId: string]: number;
}

interface CartContextType {
  cartMap: CartStorageMap;
  products: Product[];
  items: CartItemDetailed[];
  totalQuantity: number;
  orderSubtotal: number;
  hasUnconfiguredItemInCart: boolean;
  canCheckout: boolean;
  addToCart: (productId: ProductId) => void;
  removeFromCart: (productId: ProductId) => void;
  updateQuantity: (productId: ProductId, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: ProductId) => number;
  refreshCatalog: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(BASE_PRODUCTS);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = (await res.json()) as { products?: Product[] };
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        }
      }
    } catch {
      // Keep baseline server catalog snapshot if network request fails
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  // Persist only temporary customer cart selections (productId -> quantity).
  // Authoritative pricing and order validation always happen on the server.
  const [cartMap, setCartMap] = useState<CartStorageMap>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          const validated: CartStorageMap = {};
          for (const key of Object.keys(parsed)) {
            const validProd = BASE_PRODUCTS.find(p => p.id === key);
            const qty = parsed[key];
            if (validProd && typeof qty === 'number' && qty > 0) {
              validated[validProd.id] = Math.min(50, Math.floor(qty));
            }
          }
          return validated;
        }
      }
    } catch {
      // Reset to an empty cart if stored JSON is corrupted.
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartMap));
    } catch {
      // Ignore storage quota errors in restricted browsing modes.
    }
  }, [cartMap]);

  const addToCart = useCallback(
    (productId: ProductId) => {
      const prod = products.find(p => p.id === productId);
      if (prod && isPriceConfigured(prod.defaultPrice)) {
        trackSelectItem(prod);
        trackAddToCart(prod, 1, prod.defaultPrice);
      }

      setCartMap(prev => ({
        ...prev,
        [productId]: Math.min(50, (prev[productId] || 0) + 1)
      }));
    },
    [products]
  );

  const removeFromCart = useCallback(
    (productId: ProductId) => {
      const prod = products.find(p => p.id === productId);
      const existingQty = cartMap[productId] || 0;
      if (prod && existingQty > 0 && isPriceConfigured(prod.defaultPrice)) {
        trackRemoveFromCart(prod, existingQty, prod.defaultPrice);
      }

      setCartMap(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    },
    [products, cartMap]
  );

  const updateQuantity = useCallback(
    (productId: ProductId, quantity: number) => {
      const prod = products.find(p => p.id === productId);
      const prevQty = cartMap[productId] || 0;
      const clampedQty = Math.min(50, Math.floor(quantity));

      if (prod && isPriceConfigured(prod.defaultPrice)) {
        if (clampedQty > prevQty) {
          trackAddToCart(prod, clampedQty - prevQty, prod.defaultPrice);
        } else if (clampedQty < prevQty && prevQty > 0) {
          trackRemoveFromCart(
            prod,
            prevQty - Math.max(0, clampedQty),
            prod.defaultPrice
          );
        }
      }

      setCartMap(prev => {
        if (clampedQty <= 0) {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        }
        return {
          ...prev,
          [productId]: clampedQty
        };
      });
    },
    [products, cartMap]
  );

  const clearCart = useCallback(() => {
    setCartMap({});
  }, []);

  const getItemQuantity = useCallback(
    (productId: ProductId): number => {
      return cartMap[productId] || 0;
    },
    [cartMap]
  );

  const { items, totalQuantity, orderSubtotal, hasUnconfiguredItemInCart } = useMemo(() => {
    const detailedItems: CartItemDetailed[] = [];
    let totalQty = 0;
    let subtotal = 0;
    let unconfiguredFound = false;

    for (const [id, qty] of Object.entries(cartMap)) {
      if (qty <= 0) continue;
      const product = products.find(p => p.id === id);
      if (!product) continue;

      totalQty += qty;
      const price = product.defaultPrice;

      if (!product.available || !isPriceConfigured(price)) {
        unconfiguredFound = true;
        detailedItems.push({
          product,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0
        });
      } else {
        const lineSubtotal = price * qty;
        subtotal += lineSubtotal;
        detailedItems.push({
          product,
          quantity: qty,
          unitPrice: price,
          subtotal: lineSubtotal
        });
      }
    }

    return {
      items: detailedItems,
      totalQuantity: totalQty,
      orderSubtotal: subtotal,
      hasUnconfiguredItemInCart: unconfiguredFound
    };
  }, [cartMap, products]);

  const canCheckout = items.length > 0 && !hasUnconfiguredItemInCart && totalQuantity > 0;

  return (
    <CartContext.Provider
      value={{
        cartMap,
        products,
        items,
        totalQuantity,
        orderSubtotal,
        hasUnconfiguredItemInCart,
        canCheckout,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        refreshCatalog
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
