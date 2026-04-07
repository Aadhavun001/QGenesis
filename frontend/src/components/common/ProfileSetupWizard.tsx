import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Building, 
  MapPin, 
  Check, 
  ArrowRight,
  User,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const steps = [
  { 
    key: 'department', 
    label: 'Department', 
    icon: Building2, 
    placeholder: 'e.g., Computer Science',
    description: 'Enter your department name'
  },
  { 
    key: 'institution', 
    label: 'Institution', 
    icon: Building, 
    placeholder: 'e.g., ABC University',
    description: 'Enter your institution/college name'
  },
  { 
    key: 'place', 
    label: 'Place/Location', 
    icon: MapPin, 
    placeholder: 'e.g., New York, NY',
    description: 'Enter your city or location'
  },
];

const ProfileSetupWizard: React.FC<ProfileSetupWizardProps> = ({ 
  isOpen, 
  onClose, 
  onComplete 
}) => {
  const { user, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({
    department: '',
    institution: '',
    place: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setValues({
        department: user.department || '',
        institution: user.institution || '',
        place: user.place || '',
      });
      
      // Find first incomplete step
      const firstIncomplete = steps.findIndex(step => {
        const val = (user as any)[step.key];
        return !val || val.trim() === '';
      });
      setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    }
  }, [user, isOpen]);

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (!values[currentStepData.key as keyof typeof values].trim()) {
      toast.error(`Please enter your ${currentStepData.label.toLowerCase()}`);
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      updateUser({
        department: values.department.trim(),
        institution: values.institution.trim(),
        place: values.place.trim(),
      });
      
      toast.success('Profile setup complete!');
      onComplete?.();
      onClose();
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const Icon = currentStepData?.icon || User;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Setting up your profile helps ensure proper visibility of unlock requests and security history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Step {currentStep + 1} of {steps.length}</span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isComplete = values[step.key as keyof typeof values].trim() !== '';
              const isCurrent = idx === currentStep;
              
              return (
                <motion.button
                  key={step.key}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isComplete 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </motion.button>
              );
            })}
          </div>

          {/* Current Step Input */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{currentStepData.label}</h3>
                  <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={currentStepData.key}>{currentStepData.label}</Label>
                <Input
                  id={currentStepData.key}
                  value={values[currentStepData.key as keyof typeof values]}
                  onChange={(e) => setValues(prev => ({
                    ...prev,
                    [currentStepData.key]: e.target.value
                  }))}
                  placeholder={currentStepData.placeholder}
                  className="h-12"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNext();
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {currentStep === steps.length - 1 ? (
                isSubmitting ? 'Saving...' : 'Complete'
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSetupWizard;
