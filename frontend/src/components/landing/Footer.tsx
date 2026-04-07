import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Github, Linkedin, Mail, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import qgenesisLogo from '@/assets/qgenesis-logo.png';
import { getLogoShapeClass } from '@/utils/logoShape';

// X (Twitter) icon component with forwardRef
const XIcon = React.forwardRef<SVGSVGElement, { className?: string }>(({ className }, ref) => (
  <svg ref={ref} viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
));
XIcon.displayName = 'XIcon';

const getSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return XIcon;
    case 'linkedin':
      return Linkedin;
    case 'github':
      return Github;
    case 'email':
    case 'mail':
      return Mail;
    default:
      return Mail;
  }
};

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppSettingsStore();
  const footerSettings = settings.landing.footer;
  const appName = settings.branding.appName;
  const [key, setKey] = useState(0);

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.getElementById(href.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCompanyLink = (href: string, label: string) => {
    const normalizedLabel = label.trim().toLowerCase();
    // Backward-compatible: older settings may keep About Us as "#"
    if (normalizedLabel === 'about us' && href === '#') {
      navigate('/about-us');
      return;
    }
    if (href.startsWith('#')) {
      scrollToSection(href);
      return;
    }
    if (href.startsWith('/')) {
      navigate(href);
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
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
    const handleLogoUpdate = () => loadLogoSettings();
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
          key={`footer-logo-${key}`}
          src={logoSettings.imageUrl}
          alt={appName}
          className={`h-10 w-auto object-contain max-w-[100px] ${getLogoShapeClass(logoSettings.shape)}`}
          style={{
            transform: `scale(${(logoSettings.zoom || 100) / 100})`,
            filter: `brightness(${logoSettings.brightness || 100}%) contrast(${logoSettings.contrast || 100}%) saturate(${logoSettings.saturate || 100}%) hue-rotate(${logoSettings.hueRotate || 0}deg)`
          }}
        />
      );
    }

    if (logoSettings?.type === 'text' && logoSettings?.text) {
      return (
        <span className="text-2xl font-orbitron font-bold">
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
      <img
        src={qgenesisLogo}
        alt={appName}
        className="h-10 w-auto object-contain"
      />
    );
  };

  return (
    <footer className="relative border-t border-border/50 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-20" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Main footer */}
        <div className="py-12 lg:py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <motion.div 
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {renderLogo()}
            </motion.div>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {footerSettings.description}
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {footerSettings.socialLinks.map((social, index) => {
                const Icon = getSocialIcon(social.platform);
                return (
                  <motion.a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-muted/50 hover:bg-qgenesis-blue/10 text-muted-foreground hover:text-qgenesis-blue transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.platform}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {footerSettings.productLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-muted-foreground hover:text-qgenesis-blue transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {footerSettings.companyLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => handleCompanyLink(link.href, link.label)}
                    className="text-muted-foreground hover:text-qgenesis-blue transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerSettings.legalLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-qgenesis-blue transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {footerSettings.copyright}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {footerSettings.madeWith}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
