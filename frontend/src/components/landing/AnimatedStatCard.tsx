import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedStatCardProps {
  value: string | number;
  label: string;
  index: number;
  isNumeric?: boolean;
  suffix?: string;
  prefix?: string;
}

const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
  value,
  label,
  index,
  isNumeric = true,
  suffix = '',
  prefix = ''
}) => {
  const [isInView, setIsInView] = useState(false);
  
  // Parse numeric value
  const numericValue = typeof value === 'string' 
    ? parseInt(value.replace(/[^0-9]/g, ''), 10) || 0
    : value;

  const { formattedCount, isComplete } = useCountUp({
    start: 0,
    end: isInView && isNumeric ? numericValue : 0,
    duration: 2500,
    delay: index * 200,
  });

  const displayValue = isNumeric && isInView
    ? `${prefix}${formattedCount}${suffix}`
    : `${prefix}${value}${suffix}`;

  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 3 + index * 0.15, duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.05, y: -5 }}
      onViewportEnter={() => setIsInView(true)}
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Glow effect - visible on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-qgenesis-cyan/30 to-qgenesis-blue/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated pulse ring on complete */}
      {isComplete && isNumeric && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-qgenesis-cyan/50"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {/* Card - with theme support */}
      <div className="relative p-5 sm:p-6 rounded-2xl bg-card/90 dark:bg-slate-900/95 border border-border/50 dark:border-slate-700/50 shadow-2xl backdrop-blur-sm overflow-hidden transition-colors">
        {/* Subtle corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-qgenesis-cyan/10 to-transparent rounded-bl-3xl" />
        
        {/* Shimmer effect on counting */}
        {!isComplete && isNumeric && isInView && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        )}
        
        <motion.div 
          className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.2 + index * 0.15, duration: 0.4 }}
        >
          {displayValue}
        </motion.div>
        <div className="text-sm text-muted-foreground dark:text-slate-400 mt-2 font-medium">{label}</div>
      </div>
    </motion.div>
  );
};

export default AnimatedStatCard;
