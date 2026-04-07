import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, Phone } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/layout/ThemeToggle';
import AnimatedGradient from '@/components/common/AnimatedGradient';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('role') === 'admin';
  const { login, loginWithGoogle, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await login(email, password);
    
    if (result.success) {
      setShowLoadingScreen(true);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      
      // Wait for loading animation then redirect
      setTimeout(() => {
        const storedUser = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          navigate(`/${user.role}`);
        }
      }, 2000);
    } else {
      toast({
        title: 'Login Failed',
        description: result.error || 'Invalid credentials',
        variant: 'destructive',
      });
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const result = await loginWithGoogle();
    setIsGoogleLoading(false);
    if (result.success) {
      setShowLoadingScreen(true);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in with Google.',
      });
      setTimeout(() => {
        const storedUser = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          navigate(`/${user.role}`);
        }
      }, 2000);
    } else {
      toast({
        title: 'Google Sign-In Failed',
        description: result.error || 'Could not sign in with Google. Try email/password or check Firebase Console (enable Google provider).',
        variant: 'destructive',
      });
    }
  };

  // Show loading screen during login
  if (showLoadingScreen) {
    return (
      <AnimatePresence>
        <LoadingScreen minDuration={2000} />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
      <AnimatedGradient />
      
      {/* Back button and theme toggle */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <ThemeToggle />
      </div>
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isAdminLogin ? 'Admin Login' : 'Welcome Back'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAdminLogin 
                ? 'Access the admin dashboard' 
                : 'Sign in to your QGenesis account'}
            </p>
          </div>
          
          {/* Admin credentials hint */}
          {isAdminLogin && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground font-medium mb-2">Demo Credentials:</p>
              <p className="text-xs text-muted-foreground">Email: admin@qgenesis.com</p>
              <p className="text-xs text-muted-foreground">Password: admin123</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl mb-6 flex items-center justify-center gap-3 border-border/50 hover:bg-muted/50"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          {/* Phone Login Option */}
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl"
              onClick={() => navigate('/auth/phone-login')}
            >
              <Phone className="w-5 h-5 mr-2" />
              Login with Phone OTP
            </Button>
          </div>
          
          {/* Footer */}
          {!isAdminLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/auth/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
