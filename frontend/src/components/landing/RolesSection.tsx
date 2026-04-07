import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardCheck, Settings, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const roles = [
  {
    icon: GraduationCap,
    title: 'Staff',
    subtitle: 'Faculty Member',
    description: 'Upload materials, generate questions, and collaborate with your department.',
    features: [
      'Upload and analyze study materials',
      'Generate AI-powered questions',
      'Edit and refine question content',
      'Track approval history',
      'Access AI chatbot for assistance',
    ],
    gradient: 'from-qgenesis-cyan to-qgenesis-blue',
    action: 'Register as Staff',
    role: 'staff',
  },
  {
    icon: ClipboardCheck,
    title: 'HOD',
    subtitle: 'Head of Department',
    description: 'Review, approve, and maintain quality standards across your department.',
    features: [
      'Monitor all staff-generated questions',
      'Approve or reject with feedback',
      'Send notifications to staff',
      'View department analytics',
      'Maintain quality standards',
    ],
    gradient: 'from-qgenesis-purple to-qgenesis-pink',
    action: 'Register as HOD',
    role: 'hod',
  },
  {
    icon: Settings,
    title: 'Admin',
    subtitle: 'System Administrator',
    description: 'Full control over system configuration, users, and content management.',
    features: [
      'Full control over app configuration',
      'Manage roles and permissions',
      'Add/edit exam types',
      'User management & password resets',
      'Customize app content and design',
    ],
    gradient: 'from-qgenesis-orange to-qgenesis-pink',
    action: 'Admin Login',
    role: 'admin',
  },
];

interface RolesSectionProps {
  isVisible: boolean;
}

const RolesSection: React.FC<RolesSectionProps> = ({ isVisible }) => {
  const navigate = useNavigate();

  if (!isVisible) return null;

  const handleRoleSelect = (role: string) => {
    if (role === 'admin') {
      navigate('/auth/login?role=admin');
    } else {
      navigate(`/auth/register?role=${role}`);
    }
  };

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/50" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-qgenesis-purple/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-qgenesis-pink/20 rounded-full blur-3xl animate-float-reverse" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-qgenesis-purple/10 border border-qgenesis-purple/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Shield className="w-4 h-4 text-qgenesis-purple" />
            <span className="text-sm font-medium text-qgenesis-purple">Choose Your Role</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Get Started with
            <span className="text-gradient-animated ml-3">QGenesis</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Select your role to access features tailored to your needs. Each role comes with specialized tools and permissions.
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {roles.map((role, index) => (
            <motion.div
              key={index}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.2, duration: 0.5 }}
            >
              {/* Card glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />
              
              {/* Card */}
              <div className="relative h-full p-6 lg:p-8 rounded-3xl glass-card group-hover:border-qgenesis-purple/30 transition-all duration-300 flex flex-col">
                {/* Icon */}
                <div className={`relative inline-flex p-4 rounded-2xl bg-gradient-to-br ${role.gradient} mb-6 self-start`}>
                  <role.icon className="w-8 h-8 text-white" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} rounded-2xl blur-lg opacity-50`} />
                </div>

                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-foreground">{role.title}</h3>
                  <p className="text-qgenesis-purple font-medium">{role.subtitle}</p>
                </div>

                {/* Description */}
                <p className="text-muted-foreground mb-6">{role.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {role.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full bg-gradient-to-r ${role.gradient} text-white hover:opacity-90 group/btn`}
                  size="lg"
                  onClick={() => handleRoleSelect(role.role)}
                >
                  {role.action}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RolesSection;
