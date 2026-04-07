import React from 'react';
import { motion } from 'framer-motion';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

const AnimatedTitle: React.FC = () => {
  const { settings } = useAppSettingsStore();
  const appName = settings.branding.appName || 'QGENESIS';
  const tagline = settings.branding.tagline || 'Intelligent Question Generation';
  const letters = appName.toUpperCase().split("");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.3,
      },
    },
  };

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      rotateX: -90,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  const glowVariants = {
    animate: {
      textShadow: [
        "0 0 20px hsl(262 83% 58% / 0.5), 0 0 40px hsl(262 83% 58% / 0.3), 0 0 60px hsl(326 78% 60% / 0.2)",
        "0 0 30px hsl(326 78% 60% / 0.6), 0 0 60px hsl(326 78% 60% / 0.4), 0 0 80px hsl(192 91% 52% / 0.3)",
        "0 0 20px hsl(192 91% 52% / 0.5), 0 0 40px hsl(262 83% 58% / 0.3), 0 0 60px hsl(326 78% 60% / 0.2)",
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  };

  // Get logo settings for custom letter colors
  const getLogoSettings = () => {
    try {
      const stored = localStorage.getItem('qgenesis-logo-settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  };

  const logoSettings = getLogoSettings();

  const getLetterStyle = (index: number) => {
    // If there are custom logo settings with text type and letter colors, use them
    if (logoSettings?.type === 'text' && logoSettings?.letterColors?.length > 0) {
      return {
        color: logoSettings.letterColors[index % logoSettings.letterColors.length],
      };
    }

    // Default gradient style
    return {
      background: `linear-gradient(135deg, 
        hsl(262 83% 58%) ${index * 10}%, 
        hsl(326 78% 60%) ${50 + index * 5}%, 
        hsl(192 91% 52%) 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    };
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Background glow effect */}
      <div className="absolute inset-0 blur-3xl opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-qgenesis-purple via-qgenesis-pink to-qgenesis-cyan animate-pulse-glow" />
      </div>
      
      {/* Main title */}
      <motion.div
        className="relative flex items-center justify-center perspective-1000"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            className="font-orbitron text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black inline-block"
            style={getLetterStyle(index)}
            variants={letterVariants}
          >
            <motion.span
              className="inline-block"
              variants={glowVariants}
              animate="animate"
              whileHover={{
                scale: 1.2,
                transition: { type: "spring", stiffness: 400, damping: 10 },
              }}
            >
              {letter}
            </motion.span>
          </motion.span>
        ))}
      </motion.div>

      {/* Subtitle with typing effect */}
      <motion.div
        className="mt-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <motion.p
          className="text-base sm:text-lg md:text-xl font-medium text-muted-foreground tracking-[0.2em] uppercase text-center"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 1.7, duration: 0.5 }}
        >
          Transform Your Academics with Bloom's Taxonomy
        </motion.p>
      </motion.div>
      
      {/* Secondary subtitle - using tagline from settings */}
      <motion.div
        className="mt-2 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.9, duration: 0.5 }}
      >
        <motion.p
          className="text-sm sm:text-base text-muted-foreground/80 tracking-wider"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 2.1, duration: 0.5 }}
        >
          {tagline}
        </motion.p>
      </motion.div>

      {/* Decorative lines */}
      <motion.div
        className="flex items-center gap-4 mt-6"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-r from-transparent to-qgenesis-purple" />
        <div className="w-2 h-2 rounded-full bg-qgenesis-pink animate-pulse" />
        <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-l from-transparent to-qgenesis-cyan" />
      </motion.div>
    </div>
  );
};

export default AnimatedTitle;
