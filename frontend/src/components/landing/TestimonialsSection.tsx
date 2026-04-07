import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Dr. Priya Sharma',
    role: 'HOD, Computer Science',
    institution: 'National Institute of Technology',
    content: 'QGenesis has transformed how we create examination papers. What used to take days now takes hours. The AI-generated questions are remarkably aligned with our curriculum.',
    rating: 5,
    avatar: 'PS',
  },
  {
    name: 'Prof. Rajesh Kumar',
    role: 'Senior Faculty',
    institution: 'Indian Institute of Technology',
    content: 'The approval workflow is excellent. I can review questions from my entire team, provide feedback, and maintain quality standards effortlessly.',
    rating: 5,
    avatar: 'RK',
  },
  {
    name: 'Dr. Anita Desai',
    role: 'Academic Director',
    institution: 'Presidency University',
    content: 'We deployed QGenesis across 15 departments. The role-based access and multi-exam support made it a perfect fit for our institution.',
    rating: 5,
    avatar: 'AD',
  },
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="testimonials" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-qgenesis-purple/10 rounded-full blur-3xl" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-qgenesis-pink/10 rounded-full blur-3xl" />

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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-qgenesis-pink/10 border border-qgenesis-pink/20 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Star className="w-4 h-4 text-qgenesis-pink fill-qgenesis-pink" />
            <span className="text-sm font-medium text-qgenesis-pink">Trusted by Educators</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What Educators Are
            <span className="block text-gradient-animated mt-2">
              Saying About Us
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of satisfied educators who have transformed their question bank creation process.
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
            >
              {/* Card glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-qgenesis-purple/20 to-qgenesis-pink/20 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
              
              {/* Card */}
              <div className="relative h-full p-6 lg:p-8 rounded-3xl glass-card group-hover:border-qgenesis-purple/30 transition-all duration-300">
                {/* Quote icon */}
                <Quote className="w-10 h-10 text-qgenesis-purple/20 mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-qgenesis-orange fill-qgenesis-orange" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-qgenesis-purple to-qgenesis-pink flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-qgenesis-purple">{testimonial.institution}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          className="mt-16 p-8 rounded-3xl glass-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '100+', label: 'Institutions' },
              { value: '5,000+', label: 'Educators' },
              { value: '500K+', label: 'Questions Generated' },
              { value: '4.9/5', label: 'Average Rating' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-2xl sm:text-3xl font-bold text-gradient-animated">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
