import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  ShieldAlert, 
  Send, 
  Unlock, 
  KeyRound,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface LockedOverlayProps {
  isLocked: boolean;
  itemType: 'question' | 'paper';
  itemId: string;
  itemTitle: string;
  onRequestUnlock: (reason: string) => void;
  onResendRequest?: () => void;
  hasPendingRequest?: boolean;
  className?: string;
}

const LockedOverlay: React.FC<LockedOverlayProps> = ({
  isLocked,
  itemType,
  itemId,
  itemTitle,
  onRequestUnlock,
  onResendRequest,
  hasPendingRequest = false,
  className = '',
}) => {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleRequestUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error('Please provide a reason for unlock request');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate sending request
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onRequestUnlock(unlockReason);
    setShowRequestDialog(false);
    setUnlockReason('');
    setIsSubmitting(false);
    toast.success('Unlock request sent to HOD');
  };

  const handleResendRequest = async () => {
    if (!onResendRequest) return;
    setIsResending(true);
    onResendRequest();
    setIsResending(false);
    toast.success('Unlock request resent to HOD');
  };

  if (!isLocked) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 z-50 overflow-hidden rounded-lg ${className}`}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/90 via-orange-900/85 to-amber-900/80 backdrop-blur-sm" />
        
        {/* Security Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        {/* Animated Shield Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                scale: 0,
                opacity: 0 
              }}
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 0.6, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut"
              }}
            >
              <ShieldAlert className="w-4 h-4 text-red-300/50" />
            </motion.div>
          ))}
        </div>

        {/* Scan Line Effect */}
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent"
          initial={{ top: '0%' }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Main Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
          {/* Animated Lock Icon */}
          <motion.div
            className="relative mb-6"
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-full blur-2xl"
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Lock Container */}
            <motion.div
              className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <Lock className="w-10 h-10 text-white" />
              </motion.div>
            </motion.div>

            {/* Orbiting Keys */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <motion.div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <KeyRound className="w-4 h-4 text-amber-400" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Lock Status Badge */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </motion.div>
              <span className="text-sm font-semibold text-red-300 uppercase tracking-wider">
                Security Locked
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold text-white mb-2"
          >
            {itemType === 'paper' ? 'Question Paper' : 'Question'} Secured
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/70 mb-6 max-w-sm"
          >
            This {itemType} has been locked after printing to prevent unauthorized sharing or modification.
          </motion.p>

          {/* Restrictions List */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mb-6"
          >
            {['No Sharing', 'No Export', 'No Download', 'No Reprint'].map((restriction, i) => (
              <motion.div
                key={restriction}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20"
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-white/80">{restriction}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Request Unlock Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {hasPendingRequest ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </motion.div>
                  <span className="text-sm font-medium text-amber-200">Unlock Request Pending</span>
                </div>
                
                {/* Resend Button - explicit colors so visible in both light and dark app theme */}
                {onResendRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendRequest}
                    disabled={isResending}
                    className="border-2 border-white/40 bg-white/15 text-white hover:bg-white/25 hover:text-white font-medium shadow-md"
                  >
                    {isResending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                      </motion.div>
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    <span className="text-white">{isResending ? 'Resending...' : 'Resend Request'}</span>
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={() => setShowRequestDialog(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Request Unlock from HOD
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Request Unlock Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-primary" />
              Request Unlock
            </DialogTitle>
            <DialogDescription>
              Send a request to your HOD to unlock this {itemType}. Please provide a valid reason.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-sm font-medium text-foreground">{itemTitle}</p>
              <p className="text-xs text-muted-foreground capitalize">{itemType}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Unlock</label>
              <Textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Please explain why you need to unlock this item..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestUnlock}
              disabled={isSubmitting || !unlockReason.trim()}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                </motion.div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LockedOverlay;
