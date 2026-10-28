import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  isVisible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="chickchau-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] bg-[#710014] flex flex-col items-center justify-center px-6 select-none"
          aria-label="Memuat CHICKCHAU"
          role="status"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <img
              src="/logo.png"
              alt="CHICKCHAU Logo"
              className="w-48 sm:w-60 h-auto object-contain mb-6"
            />

            <div className="w-40 sm:w-48 h-1.5 bg-[#F2F1ED]/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
                className="h-full bg-[#F2F1ED] rounded-full"
              />
            </div>

            <span className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F2F1ED]/85">
              Loading...
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
