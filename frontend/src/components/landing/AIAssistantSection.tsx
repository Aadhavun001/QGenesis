import React from 'react';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, Sparkles, Zap, Brain, Lightbulb } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Conversations',
    description: 'Chat naturally with our AI to refine questions, adjust difficulty, or get suggestions.',
    color: 'from-qgenesis-purple to-qgenesis-pink',
  },
  {
    icon: Sparkles,
    title: 'Smart Suggestions',
    description: 'Get intelligent recommendations based on your teaching style and curriculum needs.',
    color: 'from-qgenesis-pink to-qgenesis-cyan',
  },
  {
    icon: Zap,
    title: 'Instant Modifications',
    description: 'Quickly modify question difficulty, format, or content with simple commands.',
    color: 'from-qgenesis-cyan to-qgenesis-blue',
  },
  {
    icon: Lightbulb,
    title: 'Learning Patterns',
    description: 'AI learns your preferences over time to generate more relevant questions.',
    color: 'from-qgenesis-blue to-qgenesis-purple',
  },
];

const AIAssistantSection: React.FC = () => {
  return (
    <section id="ai-assistant" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-qgenesis-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-qgenesis-purple/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-qgenesis-cyan/10 to-qgenesis-blue/10 border border-qgenesis-cyan/20 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Bot className="w-4 h-4 text-qgenesis-cyan" />
              <span className="text-sm font-medium text-qgenesis-cyan">AI-Powered Assistant</span>
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-orbitron mb-6">
              <span className="text-foreground">Meet Your</span>{' '}
              <span className="text-gradient">Intelligent</span>{' '}
              <span className="text-foreground">Assistant</span>
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Our AI chatbot is designed to understand your unique teaching style and curriculum requirements. 
              Get personalized question suggestions, instant modifications, and smart recommendations that 
              evolve with your needs.
            </p>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="group p-4 rounded-2xl glass-card hover:border-qgenesis-purple/30 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right side - Chat Preview */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-qgenesis-purple/20 to-qgenesis-cyan/20 rounded-3xl blur-2xl" />
            
            {/* Chat window */}
            <div className="relative glass-card rounded-3xl p-6 border border-qgenesis-purple/20">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-qgenesis-purple to-qgenesis-pink flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">QGenesis AI</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-qgenesis-green animate-pulse" />
                    Always ready to help
                  </p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-4">
                <motion.div
                  className="flex justify-end"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                    Generate 5 MCQs on Quantum Computing basics
                  </div>
                </motion.div>

                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm max-w-[80%]">
                    <p className="text-foreground text-sm">
                      I've generated 5 MCQs on Quantum Computing. Here's a preview:
                    </p>
                    <div className="mt-2 p-3 bg-background/50 rounded-xl text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Q1: What is a qubit?</p>
                      <p className="mt-1">A) Classical bit B) Quantum bit C) Binary bit D) Digital bit</p>
                    </div>
                    <p className="text-xs text-qgenesis-purple mt-2">Would you like me to adjust the difficulty?</p>
                  </div>
                </motion.div>

                <motion.div
                  className="flex justify-end"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                    Make them harder for advanced students
                  </div>
                </motion.div>
              </div>

              {/* Input */}
              <div className="mt-6 flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                <input
                  type="text"
                  placeholder="Ask AI to generate or modify questions..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  disabled
                />
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AIAssistantSection;
