/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { BrandIntro } from './components/BrandIntro';
import { ProductSection } from './components/ProductSection';
import { ClosingCTA } from './components/ClosingCTA';
import { Footer } from './components/Footer';
import { FloatingCartButton } from './components/FloatingCartButton';
import { CartPage } from './components/CartPage';
import { PriceConfigModal } from './components/PriceConfigModal';
import { SplashScreen } from './components/SplashScreen';
import { syncRouteSeo } from './utils/seo';
import { initGa4, trackPageView } from './utils/analytics';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'home' | 'cart'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/cart') {
      return 'cart';
    }
    return 'home';
  });

  const [isPriceConfigOpen, setIsPriceConfigOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    initGa4();
  }, []);

  useEffect(() => {
    syncRouteSeo(currentRoute);
    trackPageView(currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/cart') {
        setCurrentRoute('cart');
      } else {
        setCurrentRoute('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const navigateTo = (route: 'home' | 'cart', targetId?: string) => {
    setCurrentRoute(route);
    const targetPath = route === 'cart' ? '/cart' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }

    if (route === 'home') {
      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <CartProvider>
      <SplashScreen isVisible={showSplash} />
      <div className="min-h-screen flex flex-col bg-[#FFF7F0] text-[#28191B] selection:bg-[#710014] selection:text-white">
        {quotaExceeded && (
          <div
            role="alert"
            className="sticky top-0 z-50 w-full bg-amber-50 border-b border-amber-300 px-4 py-2.5 text-sm text-amber-900 flex items-center justify-between gap-4 shadow-sm"
          >
            <div>
              <strong className="font-semibold">Maps Demo Key quota reached.</strong>{' '}
              Create your own Google Maps API key with billing enabled at{' '}
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-amber-950"
              >
                Google Cloud Console
              </a>
              , then replace <code className="px-1 py-0.5 bg-amber-100 rounded text-xs">VITE_GOOGLE_MAPS_API_KEY</code> in your environment.
            </div>
            <button
              type="button"
              onClick={() => setQuotaExceeded(false)}
              className="min-h-[44px] min-w-[44px] text-amber-700 hover:text-amber-950 text-xs font-medium shrink-0 px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <Navbar
          currentRoute={currentRoute}
          onNavigate={navigateTo}
        />

        <div className="flex-1">
          {currentRoute === 'home' ? (
            <>
              <Hero onScrollToProducts={() => navigateTo('home', 'produk')} />
              <BrandIntro />
              <ProductSection />
              <ClosingCTA
                onOrderNow={() => navigateTo('home', 'produk')}
                onGoToCart={() => navigateTo('cart')}
              />
            </>
          ) : (
            <CartPage onBackToMenu={() => navigateTo('home', 'produk')} />
          )}
        </div>

        <Footer
          onNavigate={navigateTo}
          onOpenPriceConfig={() => setIsPriceConfigOpen(true)}
        />

        <FloatingCartButton
          currentRoute={currentRoute}
          onOpenCart={() => navigateTo('cart')}
        />

        <PriceConfigModal
          isOpen={isPriceConfigOpen}
          onClose={() => setIsPriceConfigOpen(false)}
        />
      </div>
    </CartProvider>
  );
}
