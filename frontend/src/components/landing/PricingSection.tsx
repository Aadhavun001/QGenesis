import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Building, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for individual educators',
    price: 'Free',
    period: 'forever',
    icon: Sparkles,
    features: [
      '100 questions/month',
      'Basic AI generation',
      'PDF upload support',
      'Email support',
      '1 user account',
    ],
    gradient: 'from-qgenesis-cyan to-qgenesis-blue',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For departments and teams',
    price: '₹2,999',
    period: '/month',
    icon: Rocket,
    features: [
      'Unlimited questions',
      'Advanced AI with Bloom\'s Taxonomy',
      'All file formats supported',
      'Priority support',
      'Up to 25 users',
      'Approval workflow',
      'Analytics dashboard',
    ],
    gradient: 'from-qgenesis-purple to-qgenesis-pink',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For institutions',
    price: 'Custom',
    period: 'pricing',
    icon: Building,
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Custom integrations',
      'Dedicated support',
      'On-premise deployment',
      'SLA guarantee',
      'Custom AI training',
    ],
    gradient: 'from-qgenesis-orange to-qgenesis-pink',
    popular: false,
  },
];

const PricingSection: React.FC = () => {
  return (
    <section id="pricing" className="relative py-20 lg:py-32 overflow-hidden">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-qgenesis-green/10 border border-qgenesis-green/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Sparkles className="w-4 h-4 text-qgenesis-green" />
            <span className="text-sm font-medium text-qgenesis-green">Simple Pricing</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Choose Your
            <span className="text-gradient-animated ml-3">Perfect Plan</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative group ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink text-white text-sm font-semibold z-20">
                  Most Popular
                </div>
              )}

              {/* Card glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />
              
              {/* Card */}
              <div className={`relative h-full p-6 lg:p-8 rounded-3xl glass-card ${plan.popular ? 'border-qgenesis-purple/50' : ''} group-hover:border-qgenesis-purple/30 transition-all duration-300`}>
                {/* Icon */}
                <div className={`relative inline-flex p-3 rounded-xl bg-gradient-to-br ${plan.gradient} mb-6`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                {/* Plan info */}
                <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className={`w-5 h-5 text-qgenesis-green flex-shrink-0`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${plan.popular 
                    ? 'bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink text-white hover:opacity-90' 
                    : 'bg-muted hover:bg-muted/80'
                  }`}
                  size="lg"
                >
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ teaser */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p className="text-muted-foreground">
            Have questions? {' '}
            <a href="#" className="text-qgenesis-purple hover:underline font-medium">
              Check our FAQ
            </a>
            {' '} or {' '}
            <a href="#" className="text-qgenesis-purple hover:underline font-medium">
              contact our team
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
