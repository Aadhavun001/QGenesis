import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import qgenesisLogo from '@/assets/qgenesis-logo.png';
import { getLogoShapeClass } from '@/utils/logoShape';

interface NavbarProps {
  onGetStarted: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { settings } = useAppSettingsStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [key, setKey] = useState(0); // Force re-render key

  // Default nav items with Blooms and Contact
  const defaultNavItems = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
    { label: 'Blooms', href: '#blooms-taxonomy' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'AI Assistant', href: '#ai-assistant' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  const navItems = settings.landing.navbar.items.length > 0 
    ? settings.landing.navbar.items 
    : defaultNavItems;
  const appName = settings.branding.appName;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Update active section based on scroll position
      const sections = navItems.map(item => item.href.replace('#', ''));
      for (const section of [...sections].reverse()) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navItems]);

  const scrollToSection = (href: string) => {
    const element = document.getElementById(href.replace('#', ''));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  // Get logo settings with live updates
  const [logoSettings, setLogoSettings] = useState<any>(null);

  const loadLogoSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem('qgenesis-logo-settings');
      if (stored) {
        setLogoSettings(JSON.parse(stored));
        setKey(prev => prev + 1);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadLogoSettings();

    // Listen for logo updates
    const handleLogoUpdate = () => {
      loadLogoSettings();
    };
    
    window.addEventListener('logo-settings-updated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logo-settings-updated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, [loadLogoSettings]);

  const renderLogo = () => {
    if (logoSettings?.type === 'image' && logoSettings?.imageUrl) {
      return (
        <img
          key={`logo-${key}`}
          src={logoSettings.imageUrl}
          alt={appName}
          className={`h-10 sm:h-12 w-auto object-contain max-w-[120px] ${getLogoShapeClass(logoSettings.shape)}`}
          style={{
            transform: `scale(${(logoSettings.zoom || 100) / 100})`,
            filter: `brightness(${logoSettings.brightness || 100}%) contrast(${logoSettings.contrast || 100}%) saturate(${logoSettings.saturate || 100}%) hue-rotate(${logoSettings.hueRotate || 0}deg)`
          }}
        />
      );
    }

    if (logoSettings?.type === 'text' && logoSettings?.text) {
      return (
        <span className="text-xl sm:text-2xl font-orbitron font-bold">
          {logoSettings.text.split('').map((letter: string, index: number) => (
            <span
              key={index}
              style={{ color: logoSettings.letterColors?.[index % logoSettings.letterColors.length] || '#6366f1' }}
            >
              {letter}
            </span>
          ))}
        </span>
      );
    }

    // Default logo - use the QGenesis logo image
    return (
      <div className="flex items-center gap-2">
        <img
          src={qgenesisLogo}
          alt={appName}
          className="h-10 sm:h-12 w-auto object-contain"
        />
      </div>
    );
  };

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'glass shadow-lg py-3 bg-background/95 dark:bg-background/90' 
            : 'bg-background/50 dark:bg-transparent py-6'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => scrollToSection('#home')}
            >
              {renderLogo()}
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeSection === item.href.replace('#', '')
                      ? 'text-foreground bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => scrollToSection(item.href)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                  {activeSection === item.href.replace('#', '') && (
                    <motion.div
                      className="h-0.5 mt-1 bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink rounded-full"
                      layoutId="activeSection"
                    />
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={() => navigate('/auth/login')}
                className="hidden sm:flex border-qgenesis-purple/50 text-foreground hover:bg-qgenesis-purple/10 hover:border-qgenesis-purple"
              >
                {settings.landing.navbar.signInText}
              </Button>
              <Button
                onClick={() => navigate('/auth/register')}
                className="bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink hover:opacity-90 text-white shadow-lg shadow-qgenesis-purple/25"
              >
                {settings.landing.navbar.getStartedText}
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.nav
              className="absolute top-20 left-4 right-4 p-6 rounded-2xl glass-card"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.href}
                    className={`px-4 py-3 rounded-xl text-left font-medium transition-all ${
                      activeSection === item.href.replace('#', '')
                        ? 'bg-gradient-to-r from-qgenesis-purple/20 to-qgenesis-pink/20 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                    onClick={() => scrollToSection(item.href)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {item.label}
                  </motion.button>
                ))}
                <div className="h-px bg-border my-2" />
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/auth/login');
                    setIsMobileMenuOpen(false);
                  }}
                  className="justify-start"
                >
                  {settings.landing.navbar.signInText}
                </Button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
