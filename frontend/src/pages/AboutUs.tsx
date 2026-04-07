import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, GraduationCap, Mail, Sparkles, CalendarClock, Cpu, Database, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const createdYear = 2026;
  const contactEmail = 'support@qgenesis.com';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh opacity-35" />
      <div className="absolute top-16 left-8 w-40 h-40 rounded-full bg-qgenesis-blue/20 blur-3xl" />
      <div className="absolute bottom-12 right-10 w-48 h-48 rounded-full bg-qgenesis-cyan/20 blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-8 hover:bg-primary/10 text-foreground border-border"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-3xl p-6 sm:p-8 lg:p-10 border border-border/40"
        >
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-qgenesis-blue/10 text-qgenesis-blue px-4 py-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              About QGenesis
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground">
              <CalendarClock className="w-4 h-4" />
              Created in {createdYear}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Smart Question Generation for Modern Institutions
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-4xl">
            QGenesis is an academic workflow platform built for staff and HOD teams to transform uploaded study material into
            high-quality, configurable questions with real-time collaboration, approval flow, and paper-building support.
            It is designed to help institutions save effort, improve quality, and scale assessment preparation professionally.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border/50 bg-card/70 p-5">
              <Building2 className="w-6 h-6 text-qgenesis-blue mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Institution Ready</h3>
              <p className="text-sm text-muted-foreground">
                Built for departments, campuses, and institutions with role-based workflows and approvals.
              </p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border/50 bg-card/70 p-5">
              <GraduationCap className="w-6 h-6 text-qgenesis-cyan mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Staff + HOD Focus</h3>
              <p className="text-sm text-muted-foreground">
                Supports end-to-end academic flow from material upload to reviewed question paper output.
              </p>
            </motion.div>
            <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border/50 bg-card/70 p-5">
              <Mail className="w-6 h-6 text-qgenesis-indigo mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Official Contact</h3>
              <a href={`mailto:${contactEmail}`} className="text-sm text-qgenesis-blue hover:underline">
                {contactEmail}
              </a>
            </motion.div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/50 bg-card/60 p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">Built With</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'React + TypeScript', icon: Cpu },
                { label: 'Firebase Firestore', icon: Database },
                { label: 'Gemini AI', icon: Bot },
                { label: 'FastAPI Extraction', icon: Sparkles },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutUs;
