import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, CheckCircle, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { useQuestionStore } from '@/stores/questionStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { firestoreFeedbackService } from '@/services/firebase/firestore-database';

interface FeedbackWidgetProps {
  userType: 'staff' | 'hod' | 'admin';
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ userType }) => {
  const { user } = useAuth();
  const { addFeedback } = useFeedbackStore();
  const { addNotification } = useQuestionStore();
  
  const [showDialog, setShowDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    addFeedback({
      rating,
      comment,
      userType,
      userEmail: user?.email,
      userName: user?.displayName,
    });

    void firestoreFeedbackService.create({
      rating,
      comment,
      userType,
      userEmail: user?.email,
      userName: user?.displayName,
      submittedByUserId: user?.id,
      submittedByRole: userType,
      targetRole: 'admin',
      sourceModule: 'app-rating',
      itemType: 'app',
      department: user?.department,
      institution: (user as any)?.institution,
      place: (user as any)?.place,
    }).catch(() => {});
    
    // Notify admin
    addNotification({
      type: 'feedback' as any,
      title: 'New App Feedback',
      message: `${user?.displayName || userType} rated the app ${rating}/5 stars`,
      fromRole: userType,
      toRole: 'admin',
    });
    
    setSubmitted(true);
    toast.success('Thank you for your feedback!');
    
    setTimeout(() => {
      setShowDialog(false);
      setSubmitted(false);
      setRating(0);
      setComment('');
    }, 2000);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2 border-border bg-background text-foreground hover:bg-muted"
      >
        <MessageSquare className="h-4 w-4" />
        Rate App
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate QGenesis</DialogTitle>
          </DialogHeader>
          
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">
                  Your feedback helps us improve QGenesis.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Star Rating */}
                <div className="flex flex-col items-center">
                  <p className="text-muted-foreground mb-4">How would you rate your experience?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        type="button"
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
                      className="text-sm text-primary mt-2"
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
                
                {/* Comment */}
                <div>
                  <Textarea
                    placeholder="Tell us more about your experience (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>
                
                {/* Submit */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={rating === 0}>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackWidget;
