import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { firestoreFeedbackService } from '@/services/firebase/firestore-database';

const FeedbackSection: React.FC = () => {
  const { addFeedback } = useFeedbackStore();
  const { addNotification } = useQuestionStore();
  const { settings } = useAppSettingsStore();
  const feedbackSettings = settings.landing.feedback;
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [userType, setUserType] = useState<string>('');
  const [instituteName, setInstituteName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating > 0) {
      addFeedback({
        rating,
        comment: feedback,
        userType: (userType as 'staff' | 'hod' | 'public') || 'public',
        instituteName: instituteName || undefined,
      });

      void firestoreFeedbackService.create({
        rating,
        comment: feedback,
        userType: (userType as 'staff' | 'hod' | 'public') || 'public',
        instituteName: instituteName || undefined,
        submittedByRole: (userType as 'staff' | 'hod' | 'public') || 'public',
        targetRole: 'admin',
        sourceModule: 'landing-feedback',
        itemType: 'app',
      }).catch(() => {});
      
      // Notify admin
      addNotification({
        type: 'info',
        title: 'New Public Feedback',
        message: `Someone from ${instituteName || 'public'} rated ${rating}/5 stars`,
        fromRole: 'staff',
        toRole: 'admin',
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setFeedback('');
        setUserType('');
        setInstituteName('');
      }, 3000);
    }
  };

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-qgenesis-blue/5 via-background to-qgenesis-cyan/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-qgenesis-blue/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-12">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            {feedbackSettings.title.split(' ').map((word, i) => 
              word.toLowerCase() === 'feedback' ? (
                <span key={i} className="text-gradient-animated">{word} </span>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {feedbackSettings.subtitle}
          </p>
        </motion.div>

        <motion.div
          className="glass-card rounded-3xl p-8 lg:p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className="inline-flex p-4 rounded-full bg-qgenesis-green/10 mb-4">
                  <CheckCircle className="w-12 h-12 text-qgenesis-green" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Thank You!</h3>
                <p className="text-muted-foreground">
                  We appreciate your feedback and will use it to improve {settings.branding.appName}.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* User Type and Institute */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="mb-2 block">I am a</Label>
                    <Select value={userType} onValueChange={setUserType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff / Faculty</SelectItem>
                        <SelectItem value="hod">HOD / Department Head</SelectItem>
                        <SelectItem value="public">Student / Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="mb-2 block">Institute/College (optional)</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Your college name"
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Star Rating */}
                <div className="flex flex-col items-center mb-8">
                  <p className="text-muted-foreground mb-4">How would you rate your experience?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 transition-transform"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            star <= (hoveredRating || rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <motion.p
                      className="text-sm text-qgenesis-blue mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {rating === 5 && 'Excellent! 🎉'}
                      {rating === 4 && 'Great! 😊'}
                      {rating === 3 && 'Good 👍'}
                      {rating === 2 && 'Could be better 🤔'}
                      {rating === 1 && "We'll do better 💪"}
                    </motion.p>
                  )}
                </div>

                {/* Feedback Text */}
                <div className="mb-6">
                  <Textarea
                    placeholder="Tell us more about your experience (optional)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px] bg-background/50 border-border/50 focus:border-qgenesis-blue resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className="group bg-gradient-to-r from-qgenesis-blue to-qgenesis-cyan hover:shadow-lg hover:shadow-qgenesis-blue/30 text-white px-8 py-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                    Submit Feedback
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default FeedbackSection;
