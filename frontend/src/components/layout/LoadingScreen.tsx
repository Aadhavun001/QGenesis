import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import qgenesisLogoDefault from '@/assets/qgenesis-logo.png';
import { getLogoShapeClass } from '@/utils/logoShape';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, minDuration = 2000 }) => {
  const [progress, setProgress] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string>(qgenesisLogoDefault);
  const [logoShape, setLogoShape] = useState<string>('');

  const loadLogo = () => {
    try {
      const stored = localStorage.getItem('qgenesis-logo-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.type === 'image' && settings.imageUrl) setLogoUrl(settings.imageUrl);
        if (settings.shape) setLogoShape(settings.shape);
      }
    } catch {}
  };

  useEffect(() => {
    loadLogo();
    window.addEventListener('logo-settings-updated', loadLogo);
    return () => window.removeEventListener('logo-settings-updated', loadLogo);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    const timer = setTimeout(() => {
      onComplete?.();
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDuration, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-background via-background to-background overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-qgenesis-purple/30 to-qgenesis-pink/30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: 0,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Circular glow rings */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full border border-qgenesis-purple/20"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full border border-qgenesis-pink/20"
        animate={{
          scale: [1.2, 0.8, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="flex flex-col items-center gap-8 z-10">
        {/* Animated Logo Container */}
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            duration: 0.8,
          }}
        >
          {/* Outer glow */}
          <motion.div
            className="absolute inset-[-20px] bg-gradient-to-br from-qgenesis-purple/40 to-qgenesis-pink/40 rounded-3xl blur-2xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Inner spinning ring */}
          <motion.div
            className="absolute inset-[-10px] rounded-3xl border-2 border-transparent"
            style={{
              background: 'linear-gradient(to right, transparent, transparent), linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          
          {/* Logo */}
          <motion.div
            className="relative w-28 h-28 rounded-2xl bg-background/80 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/10 overflow-hidden"
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(99, 102, 241, 0.3)',
                '0 0 40px rgba(139, 92, 246, 0.5)',
                '0 0 20px rgba(99, 102, 241, 0.3)',
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <motion.img
              src={logoUrl}
              alt="QGenesis"
              className={`w-24 h-24 object-cover ${getLogoShapeClass(logoShape)}`}
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Loading text with typewriter effect */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.h2 
            className="text-3xl font-orbitron font-bold mb-2"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899, #6366f1)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            QGenesis
          </motion.h2>
          <motion.p 
            className="text-muted-foreground text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Preparing your experience...
          </motion.p>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="w-64 h-1 bg-muted/30 rounded-full overflow-hidden"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-qgenesis-purple via-qgenesis-pink to-qgenesis-purple rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%'],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>

        {/* Loading dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 rounded-full"
              style={{
                background: `linear-gradient(135deg, #6366f1, #ec4899)`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
                y: [0, -8, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: index * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
