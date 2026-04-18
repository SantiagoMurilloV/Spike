import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-[#003087] to-[#0F0F14] flex flex-col items-center justify-center z-50"
      initial={{ opacity: 1 }}
      animate={{ opacity: progress >= 100 ? 0 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
          <span 
            className="text-[#E31E24] font-bold text-6xl"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            S
          </span>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-5xl font-bold text-white mb-2"
        style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        SPIKE
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-white/80 text-lg mb-12"
      >
        Tournament System
      </motion.p>

      {/* Loading Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-64 h-1 bg-white/20 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-[#E31E24]"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </motion.div>
    </motion.div>
  );
}
