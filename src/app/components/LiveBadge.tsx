import { motion } from 'motion/react';

interface LiveBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LiveBadge({ size = 'md', showText = true }: LiveBadgeProps) {
  const sizes = {
    sm: { container: 'px-2 py-1 text-xs', dot: 'w-1.5 h-1.5' },
    md: { container: 'px-3 py-1 text-xs', dot: 'w-2 h-2' },
    lg: { container: 'px-4 py-2 text-sm', dot: 'w-2.5 h-2.5' },
  };

  return (
    <div className={`flex items-center gap-2 bg-[#E31E24] text-white rounded-full ${sizes[size].container}`}>
      <motion.div
        className={`bg-white rounded-full ${sizes[size].dot}`}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      {showText && (
        <span className="font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          EN VIVO
        </span>
      )}
    </div>
  );
}
