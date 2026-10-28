import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  isVisible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  useEffect(() => {
    if (isVisible) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="chickchau-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 top-0 left-0 z-[100] w-full max-w-[100vw] h-[100dvh] min-h-screen bg-[#710014] grid place-items-center p-6 overflow-hidden select-none touch-none"
          aria-label="Memuat CHICKCHAU"
          role="status"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[260px] sm:max-w-[300px] mx-auto flex flex-col items-center justify-center text-center"
          >
            <div className="w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center mx-auto mb-5">
              <img
                src="/logo.png"
                alt="CHICKCHAU Logo"
                className="w-full h-full object-contain object-center block mx-auto"
              />
            </div>

            <div className="w-36 sm:w-48 h-1.5 bg-[#F2F1ED]/20 rounded-full overflow-hidden mx-auto">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
                className="h-full bg-[#F2F1ED] rounded-full"
              />
            </div>

            <span className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F2F1ED]/90 text-center block">
              Loading...
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
