import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Lightbulb, Cog, BarChart3, CheckCircle, Sparkles } from 'lucide-react';

const BloomsTaxonomySection: React.FC = () => {
  const taxonomyLevels = [
    {
      level: 'Remember',
      description: 'Recall facts and basic concepts',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: Brain,
      examples: ['Define', 'List', 'Identify', 'Name'],
    },
    {
      level: 'Understand',
      description: 'Explain ideas or concepts',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      icon: Lightbulb,
      examples: ['Describe', 'Explain', 'Summarize', 'Interpret'],
    },
    {
      level: 'Apply',
      description: 'Use information in new situations',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: Cog,
      examples: ['Solve', 'Demonstrate', 'Apply', 'Use'],
    },
    {
      level: 'Analyze',
      description: 'Draw connections among ideas',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: BarChart3,
      examples: ['Compare', 'Contrast', 'Examine', 'Differentiate'],
    },
    {
      level: 'Evaluate',
      description: 'Justify a stand or decision',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: CheckCircle,
      examples: ['Judge', 'Critique', 'Assess', 'Evaluate'],
    },
    {
      level: 'Create',
      description: 'Produce new or original work',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      icon: Sparkles,
      examples: ['Design', 'Construct', 'Develop', 'Formulate'],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const pyramidVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <section id="blooms-taxonomy" className="relative py-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-qgenesis-purple/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-qgenesis-cyan/10 rounded-full blur-3xl animate-float-reverse" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-qgenesis-purple/10 to-qgenesis-pink/10 border border-qgenesis-purple/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Brain className="w-4 h-4 text-qgenesis-purple" />
            <span className="text-sm font-medium bg-gradient-to-r from-qgenesis-purple to-qgenesis-pink bg-clip-text text-transparent">
              Cognitive Learning Framework
            </span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="text-foreground">Powered by </span>
            <span className="bg-gradient-to-r from-qgenesis-purple via-qgenesis-pink to-qgenesis-cyan bg-clip-text text-transparent">
              Bloom's Taxonomy
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            QGenesis generates questions aligned with Bloom's Taxonomy, ensuring comprehensive 
            cognitive assessment across all six levels of learning - from basic recall to creative synthesis.
          </p>
        </motion.div>

        {/* Taxonomy Pyramid */}
        <motion.div
          className="relative mb-16"
          variants={pyramidVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="flex flex-col items-center gap-3">
            {[...taxonomyLevels].reverse().map((level, index) => {
              const width = 40 + index * 10;
              return (
                <motion.div
                  key={level.level}
                  className={`relative overflow-hidden rounded-xl ${level.bgColor} ${level.borderColor} border backdrop-blur-sm`}
                  style={{ width: `${width}%`, minWidth: '200px' }}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${level.color} opacity-5`} />
                  <div className="relative p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${level.color}`}>
                        <level.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{level.level}</h3>
                        <p className="text-sm text-muted-foreground hidden sm:block">{level.description}</p>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
                      {level.examples.map((example) => (
                        <span
                          key={example}
                          className={`text-xs px-2 py-1 rounded-full ${level.bgColor} ${level.borderColor} border text-foreground/80`}
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            {
              title: 'Comprehensive Assessment',
              description: 'Generate questions that test all cognitive levels, from basic knowledge to creative thinking.',
              icon: '🎯',
            },
            {
              title: 'Curriculum Aligned',
              description: 'Questions automatically categorized by cognitive complexity for balanced exams.',
              icon: '📚',
            },
            {
              title: 'Learning Outcomes',
              description: 'Map questions to specific learning objectives and educational standards.',
              icon: '✨',
            },
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="relative group"
              variants={itemVariants}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-qgenesis-purple/20 to-qgenesis-cyan/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-6 rounded-2xl glass-card border border-border/50 h-full">
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BloomsTaxonomySection;
