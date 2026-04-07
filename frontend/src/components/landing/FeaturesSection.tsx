import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  FileText, 
  Users, 
  Shield, 
  MessageSquare, 
  Sparkles,
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Generation',
    description: 'Advanced NLP and ML algorithms analyze your materials to generate contextually relevant questions aligned with Bloom\'s Taxonomy.',
    iconBg: '#3b82f6',
    arrowBg: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    delay: 0,
  },
  {
    icon: FileText,
    title: 'Smart Material Analysis',
    description: 'Upload PDFs, textbooks, and study materials. Our system extracts key concepts and learning objectives automatically.',
    iconBg: '#06b6d4',
    arrowBg: 'linear-gradient(135deg, #06b6d4, #6366f1)',
    delay: 0.1,
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description: 'Secure authentication with distinct roles for Staff, HOD, and Admin. Each with tailored permissions and workflows.',
    iconBg: '#8b5cf6',
    arrowBg: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    delay: 0.2,
  },
  {
    icon: Shield,
    title: 'Approval Workflow',
    description: 'HOD can review, approve, or reject questions with feedback. Maintain quality and academic standards.',
    iconBg: '#ec4899',
    arrowBg: 'linear-gradient(135deg, #ec4899, #3b82f6)',
    delay: 0.3,
  },
  {
    icon: MessageSquare,
    title: 'AI Chatbot Assistant',
    description: 'Integrated conversational AI helps faculty refine and regenerate questions dynamically.',
    iconBg: '#14b8a6',
    arrowBg: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
    delay: 0.4,
  },
  {
    icon: Sparkles,
    title: 'Multi-Exam Support',
    description: 'Generate questions for CA1, CA2, Semester exams, and custom examination types.',
    iconBg: '#f59e0b',
    arrowBg: 'linear-gradient(135deg, #f59e0b, #06b6d4)',
    delay: 0.5,
  },
];

const FeaturesSection: React.FC = () => {
  const navigate = useNavigate();

  const handleArrowClick = () => {
    navigate('/auth/login');
  };

  return (
    <section id="features" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-qgenesis-blue/10 rounded-full blur-3xl" />

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-qgenesis-blue/10 border border-qgenesis-blue/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Zap className="w-4 h-4 text-qgenesis-blue" />
            <span className="text-sm font-medium text-qgenesis-blue">Powerful Features</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything You Need for
            <span className="block text-gradient-animated mt-2">
              Modern Question Banking
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comprehensive tools designed to streamline your academic assessment workflow and maintain the highest standards.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="group relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay, duration: 0.5 }}
            >
              {/* Card glow effect */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"
                style={{ background: feature.arrowBg }}
              />
              
              {/* Card content */}
              <div className="relative h-full p-6 lg:p-8 rounded-3xl border border-border bg-card shadow-lg group-hover:border-primary/30 transition-all duration-300">
                {/* Icon with inline style for visibility */}
                <div 
                  className="relative inline-flex p-4 rounded-2xl mb-6 shadow-lg"
                  style={{ backgroundColor: feature.iconBg }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover arrow - clickable to sign in */}
                <motion.button
                  onClick={handleArrowClick}
                  className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: feature.arrowBg }}
                  >
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          className="mt-16 flex items-center justify-center gap-8 flex-wrap"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {[
            { icon: Lock, text: 'Enterprise Security' },
            { icon: Zap, text: 'Lightning Fast' },
            { icon: Users, text: 'Multi-User Support' },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="w-5 h-5 text-qgenesis-blue" />
              <span className="text-sm font-medium">{item.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
