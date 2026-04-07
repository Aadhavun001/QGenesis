import React from 'react';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import BloomsTaxonomySection from '@/components/landing/BloomsTaxonomySection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import AIAssistantSection from '@/components/landing/AIAssistantSection';
import FAQSection from '@/components/landing/FAQSection';
import ContactSection from '@/components/landing/ContactSection';
import FeedbackSection from '@/components/landing/FeedbackSection';
import Footer from '@/components/landing/Footer';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden scroll-smooth">
      <Navbar onGetStarted={() => {}} />
      <HeroSection onGetStarted={() => {}} />
      <FeaturesSection />
      <BloomsTaxonomySection />
      <HowItWorksSection />
      <AIAssistantSection />
      <FAQSection />
      <ContactSection />
      <FeedbackSection />
      <Footer />
    </div>
  );
};

export default Landing;
