import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Brain, CheckCircle, FileCheck, ArrowRight } from 'lucide-react';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

const defaultSteps = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload Materials',
    description: 'Upload your study materials, PDFs, textbooks, or any educational content you want to generate questions from.',
    color: 'qgenesis-purple',
  },
  {
    step: '02',
    icon: Brain,
    title: 'AI Analysis',
    description: 'Our advanced AI analyzes the content, identifies key concepts, and understands the learning objectives.',
    color: 'qgenesis-pink',
  },
  {
    step: '03',
    icon: FileCheck,
    title: 'Generate Questions',
    description: 'Get professionally crafted questions with multiple difficulty levels and question types automatically.',
    color: 'qgenesis-cyan',
  },
  {
    step: '04',
    icon: CheckCircle,
    title: 'Review & Approve',
    description: 'HOD reviews the questions, provides feedback, and approves them for the final question bank.',
    color: 'qgenesis-green',
  },
];

const iconMap: { [key: string]: React.ElementType } = {
  Upload,
  Brain,
  FileCheck,
  CheckCircle,
};

const HowItWorksSection: React.FC = () => {
  const { settings } = useAppSettingsStore();
  const howItWorksSettings = settings.landing.howItWorks;

  // Merge settings with defaults
  const steps = howItWorksSettings.steps.map((step, index) => ({
    step: String(index + 1).padStart(2, '0'),
    icon: defaultSteps[index]?.icon || Brain,
    title: step.title,
    description: step.description,
    color: defaultSteps[index]?.color || 'qgenesis-blue',
  }));

  const getColorValue = (colorName: string) => {
    switch (colorName) {
      case 'qgenesis-purple': return '#a855f7';
      case 'qgenesis-pink': return '#ec4899';
      case 'qgenesis-cyan': return '#06b6d4';
      case 'qgenesis-green': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  return (
    <section id="how-it-works" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-qgenesis-cyan/10 border border-qgenesis-cyan/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Brain className="w-4 h-4 text-qgenesis-cyan" />
            <span className="text-sm font-medium text-qgenesis-cyan">Simple Process</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {howItWorksSettings.title.split(' ').map((word, i, arr) => 
              word.toLowerCase() === 'qgenesis' || word.toLowerCase() === settings.branding.appName.toLowerCase() ? (
                <span key={i} className="text-gradient-animated mx-1">{word}</span>
              ) : (
                <span key={i}>{word}{i < arr.length - 1 ? ' ' : ''}</span>
              )
            )}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {howItWorksSettings.subtitle}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line - desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-qgenesis-purple via-qgenesis-pink via-qgenesis-cyan to-qgenesis-green -translate-y-1/2 z-0" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
              >
                {/* Step card */}
                <div className="relative z-10 p-6 lg:p-8 rounded-3xl glass-card text-center group hover:scale-105 transition-transform duration-300">
                  {/* Step number */}
                  <div 
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-white text-sm font-bold shadow-lg"
                    style={{ backgroundColor: getColorValue(step.color) }}
                  >
                    Step {step.step}
                  </div>

                  {/* Icon */}
                  <motion.div
                    className={`relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-${step.color}/20 to-${step.color}/5 flex items-center justify-center mt-4 mb-6`}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <step.icon className={`w-10 h-10 text-${step.color}`} />
                    <div className={`absolute inset-0 bg-${step.color}/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow connector - mobile/tablet */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/50 rotate-90 sm:rotate-0" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-muted-foreground mb-6">
            Ready to revolutionize your question bank creation process?
          </p>
          <motion.button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink text-white font-semibold shadow-lg shadow-qgenesis-purple/25 hover:shadow-2xl hover:shadow-qgenesis-purple/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
