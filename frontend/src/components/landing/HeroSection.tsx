import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles, Zap, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedTitle from './AnimatedTitle';
import AnimatedStatCard from './AnimatedStatCard';
import heroBg from '@/assets/hero-bg.jpg';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/services/firebase/firestore-config';

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { settings } = useAppSettingsStore();
  const FALLBACK_PUBLIC_COUNT = 50000;
  const [totalGeneratedCount, setTotalGeneratedCount] = useState<number>(() => {
    try {
      const cached = Number(localStorage.getItem('qgenesis-public-generated-count') || '');
      if (Number.isFinite(cached) && cached > 0) return Math.floor(cached);
    } catch {
      // ignore localStorage errors
    }
    return FALLBACK_PUBLIC_COUNT;
  });
  
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) {
      return;
    }
    const statsRef = doc(db, 'app_settings', 'public_stats');
    const rawUnsubscribe = onSnapshot(statsRef, (snap) => {
      const data = snap.data() as { totalQuestionsGenerated?: number } | undefined;
      const incoming = data?.totalQuestionsGenerated || 0;
      setTotalGeneratedCount(incoming);
      try {
        localStorage.setItem('qgenesis-public-generated-count', String(incoming));
      } catch {
        // ignore localStorage errors
      }
    }, () => {
      // Keep last good/cached value on listener errors (never reset to 0).
    });
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      rawUnsubscribe();
    };
  }, []);

  const floatingIcons = [
    { icon: Sparkles, position: 'top-20 left-[10%]', delay: 0, color: 'text-qgenesis-blue' },
    { icon: Zap, position: 'top-40 right-[15%]', delay: 0.5, color: 'text-qgenesis-cyan' },
    { icon: Shield, position: 'bottom-40 left-[5%]', delay: 1, color: 'text-qgenesis-indigo' },
    { icon: Users, position: 'bottom-20 right-[10%]', delay: 1.5, color: 'text-qgenesis-blue' },
  ];

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 dark:opacity-50"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80 dark:from-background/50 dark:via-background/30 dark:to-background/60" />
      
      {/* Animated background mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      
      {/* Animated orbs - multi-color tones */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-qgenesis-blue/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-qgenesis-teal/15 rounded-full blur-3xl animate-float-reverse animation-delay-2000" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-qgenesis-purple/10 rounded-full blur-3xl animate-float animation-delay-3000" />
      <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-qgenesis-cyan/10 rounded-full blur-3xl animate-float animation-delay-4000" />

      {/* Floating icons */}
      {floatingIcons.map(({ icon: Icon, position, delay, color }, index) => (
        <motion.div
          key={index}
          className={`absolute ${position} hidden lg:block`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: delay + 2, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay }}
          >
            <div className="p-4 rounded-2xl glass-card">
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-20 lg:py-32 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-qgenesis-blue/10 to-qgenesis-cyan/10 border border-qgenesis-blue/20 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-qgenesis-blue opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-qgenesis-blue" />
          </span>
          <span className="text-sm font-medium bg-gradient-to-r from-qgenesis-blue to-qgenesis-cyan bg-clip-text text-transparent">
            {settings.landing.heroSubtitle}
          </span>
        </motion.div>

        {/* Animated Title */}
        <AnimatedTitle />

        {/* Description */}
        <motion.p
          className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
        >
          {settings.landing.heroDescription}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => navigate('/auth/register')}
            className="group relative overflow-hidden bg-gradient-to-r from-qgenesis-blue to-qgenesis-cyan hover:shadow-2xl hover:shadow-qgenesis-blue/30 text-white text-lg px-8 py-6 rounded-2xl transition-all duration-300"
          >
            <span className="relative z-10 flex items-center">
              {settings.landing.navbar.getStartedText || 'Get Started Now'}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-qgenesis-cyan to-qgenesis-blue opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="group text-lg px-8 py-6 rounded-2xl border-border/50 hover:border-qgenesis-blue/50 hover:bg-qgenesis-blue/5"
          >
            <Play className="w-5 h-5 mr-2 text-qgenesis-blue" />
            See How It Works
          </Button>
        </motion.div>

        {/* Stats - Animated with real-time data */}
        <motion.div
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.6 }}
        >
          {[
            { value: 99, label: 'Accuracy Rate', suffix: '%', isNumeric: true },
            { value: '10x', label: 'Faster Generation', isNumeric: false },
            { value: totalGeneratedCount, label: 'Questions Generated', isNumeric: true },
            { value: '24/7', label: 'AI Assistance', isNumeric: false },
          ].map((stat, index) => (
            <AnimatedStatCard
              key={index}
              value={stat.value}
              label={stat.label}
              index={index}
              isNumeric={stat.isNumeric}
              suffix={stat.suffix || ''}
            />
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5, duration: 0.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-qgenesis-blue"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
