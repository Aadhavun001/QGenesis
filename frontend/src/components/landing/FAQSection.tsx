import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

const FALLBACK_FAQ_ITEMS = [
  {
    question: 'What question types can I generate in QGenesis?',
    answer: 'You can generate MCQ, short, long, and descriptive questions. Each set can be configured with difficulty, Bloom\'s level, marks, and topic focus.',
  },
  {
    question: 'Does QGenesis generate questions only from my uploaded material?',
    answer: 'Yes. When material is selected, question generation and answer regeneration are grounded to that content so outputs stay aligned with your syllabus.',
  },
  {
    question: 'Can I regenerate only one question or one answer?',
    answer: 'Yes. You can regenerate a specific question with configuration overrides, regenerate only the answer, or edit and then regenerate so only the selected item changes.',
  },
  {
    question: 'How does “Keep in chat” work?',
    answer: 'You can keep one question or selected/all questions under the user prompt in the chat transcript. The saved block is stored and restored with chat history.',
  },
  {
    question: 'Is my data saved in Firebase in real time?',
    answer: 'Yes. Chat messages, generated questions, kept-in-chat blocks, and chat title updates are persisted so state is restored when you reopen the app.',
  },
  {
    question: 'Can I use QGenesis on mobile, tablet, and desktop?',
    answer: 'Yes. The landing page and dashboards use responsive layouts and breakpoints for phones, tablets, laptops, and large screens, with adaptive spacing and controls.',
  },
  {
    question: 'What should I do if generation looks incomplete?',
    answer: 'Use regenerate for that specific item. The assistant includes retry and repair handling for malformed or partial model outputs, especially for MCQ formatting.',
  },
  {
    question: 'Can I review and edit questions before finalizing?',
    answer: 'Absolutely. All generated questions and answers are editable before saving to bank/cloud, keeping in chat, or using them for paper building.',
  },
];

const FAQSection: React.FC = () => {
  const { settings } = useAppSettingsStore();
  const faqSettings = settings.landing.faq;
  const contactEmail = settings.landing.contact.email;
  const faqItems = faqSettings.items && faqSettings.items.length >= 6 ? faqSettings.items : FALLBACK_FAQ_ITEMS;

  return (
    <section id="faq" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
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
            <HelpCircle className="w-4 h-4 text-qgenesis-purple" />
            <span className="text-sm font-medium text-qgenesis-purple">Got Questions?</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-orbitron mb-4">
            <span className="text-gradient">{faqSettings.title.split(' ').slice(0, 2).join(' ')}</span>{' '}
            <span className="text-foreground">{faqSettings.title.split(' ').slice(2).join(' ')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {faqSettings.subtitle}
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="glass-card rounded-2xl px-4 sm:px-6 border-none"
                >
                  <AccordionTrigger className="text-left font-medium text-foreground hover:text-qgenesis-purple transition-colors py-5 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-muted-foreground">
            Still have questions?{' '}
            <a href={`mailto:${contactEmail}`} className="text-qgenesis-purple hover:underline font-medium">
              Contact our support team
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
