import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import ThemeToggle from '@/components/layout/ThemeToggle';
import AnimatedGradient from '@/components/common/AnimatedGradient';

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

/** Normalize phone to E.164 (e.g. 9876543210 -> +919876543210) */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 && !value.trim().startsWith('+')) {
    return `+91${digits}`;
  }
  if (digits.length >= 10 && value.trim().startsWith('+')) {
    return value.trim();
  }
  return digits ? `+${digits}` : value;
}

const PhoneLogin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendPhoneOTP, verifyPhoneOTP } = useAuth();
  const firebaseEnabled = isFirebaseConfigured();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phone.replace(/\D/g, '').length < 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number with country code (e.g. +91 9876543210)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    if (firebaseEnabled) {
      const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
      if (container) container.innerHTML = '';
      const normalized = normalizePhone(phone);
      const result = await sendPhoneOTP(normalized, RECAPTCHA_CONTAINER_ID);
      setIsLoading(false);
      if (result.success) {
        toast({
          title: 'OTP Sent!',
          description: `A 6-digit code has been sent to ${normalized}`,
        });
        setStep('otp');
      } else {
        toast({
          title: 'Could not send OTP',
          description: result.error || 'Check that Phone sign-in is enabled in Firebase Console.',
          variant: 'destructive',
        });
      }
    } else {
      await new Promise((r) => setTimeout(r, 1000));
      setIsLoading(false);
      toast({
        title: 'Phone login not configured',
        description: 'Enable Firebase and Phone sign-in in Firebase Console.',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the complete 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    if (firebaseEnabled) {
      const result = await verifyPhoneOTP(otp);
      setIsLoading(false);
      if (result.success) {
        toast({
          title: 'Login Successful!',
          description: 'Welcome back!',
        });
        const stored = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
        const role = stored ? (JSON.parse(stored) as { role?: string }).role : 'staff';
        navigate(role ? `/${role}` : '/staff');
      } else {
        toast({
          title: 'Invalid OTP',
          description: result.error || 'The code is incorrect or expired. Request a new one.',
          variant: 'destructive',
        });
      }
    } else {
      setIsLoading(false);
      toast({
        title: 'Phone login not configured',
        description: 'Enable Firebase and Phone sign-in in Firebase Console.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
      <AnimatedGradient />
      
      {/* Back button and theme toggle */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Button variant="ghost" onClick={() => navigate('/auth/login')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>
        <ThemeToggle />
      </div>
      
      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Phone className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {step === 'phone' ? 'Phone Login' : 'Verify OTP'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {step === 'phone' 
                ? 'Enter your registered phone number' 
                : `Enter the 6-digit code sent to ${phone}`}
            </p>
          </div>
          
          {/* reCAPTCHA container for Firebase Phone Auth (invisible) */}
          <div id={RECAPTCHA_CONTAINER_ID} aria-hidden="true" className="sr-only" />

          {/* Demo hint only when Firebase phone auth is not used */}
          {step === 'otp' && !firebaseEnabled && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground font-medium">Demo OTP: 123456</p>
            </div>
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-11 h-12 rounded-xl"
                    required
                  />
                </div>
                {firebaseEnabled && (
                  <p className="text-xs text-muted-foreground">Include country code. Indian numbers: +91 followed by 10 digits.</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-lg font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </form>
          )}
          
          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="space-y-4">
                <Label>Enter Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-lg font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('phone')}
              >
                Change Phone Number
              </Button>
            </form>
          )}
          
          {/* Footer */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Want to use email?{' '}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                Sign in with email
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/auth/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneLogin;
