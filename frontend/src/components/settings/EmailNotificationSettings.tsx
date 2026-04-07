import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Bell, 
  CheckCircle, 
  XCircle, 
  FileText, 
  MessageSquare,
  Save,
  RotateCcw,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface EmailSettings {
  enabled: boolean;
  email: string;
  onApproval: boolean;
  onRejection: boolean;
  onNewSubmission: boolean;
  onFeedback: boolean;
  onPaperReady: boolean;
  digestMode: 'instant' | 'daily' | 'weekly';
}

const DEFAULT_SETTINGS: EmailSettings = {
  enabled: false,
  email: '',
  onApproval: true,
  onRejection: true,
  onNewSubmission: true,
  onFeedback: true,
  onPaperReady: true,
  digestMode: 'instant',
};

const EmailNotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('qgenesis-email-settings');
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch {}
    }
  }, []);

  const handleSave = async () => {
    if (settings.enabled && !settings.email) {
      toast.error('Please enter an email address');
      return;
    }

    if (settings.enabled && !settings.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    
    localStorage.setItem('qgenesis-email-settings', JSON.stringify(settings));
    toast.success('Email notification settings saved!');
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('qgenesis-email-settings');
    toast.success('Settings reset to defaults');
  };

  const handleTestEmail = async () => {
    if (!settings.email) {
      toast.error('Please enter an email address first');
      return;
    }

    toast.success(`Test email sent to ${settings.email}`);
  };

  const NotificationOption = ({ 
    icon: Icon, 
    label, 
    description, 
    checked, 
    onChange,
    color
  }: {
    icon: any;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    color: string;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={!settings.enabled}
      />
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Configure email alerts for important events
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Enable Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive email alerts for platform activity</p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {/* Email Input */}
        <motion.div
          initial={false}
          animate={{ opacity: settings.enabled ? 1 : 0.5 }}
          className="space-y-2"
        >
          <Label>Email Address</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={settings.email}
              onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
              disabled={!settings.enabled}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={!settings.enabled || !settings.email}
            >
              <Send className="w-4 h-4 mr-2" />
              Test
            </Button>
          </div>
        </motion.div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-3">
          <Label>Notification Types</Label>
          
          <NotificationOption
            icon={CheckCircle}
            label="Question Approvals"
            description="Get notified when your questions are approved"
            checked={settings.onApproval}
            onChange={(checked) => setSettings(prev => ({ ...prev, onApproval: checked }))}
            color="from-green-500 to-emerald-500"
          />

          <NotificationOption
            icon={XCircle}
            label="Question Rejections"
            description="Get notified when questions need revision"
            checked={settings.onRejection}
            onChange={(checked) => setSettings(prev => ({ ...prev, onRejection: checked }))}
            color="from-red-500 to-rose-500"
          />

          <NotificationOption
            icon={FileText}
            label="New Submissions"
            description="Get notified of new question paper submissions"
            checked={settings.onNewSubmission}
            onChange={(checked) => setSettings(prev => ({ ...prev, onNewSubmission: checked }))}
            color="from-blue-500 to-cyan-500"
          />

          <NotificationOption
            icon={MessageSquare}
            label="Feedback Received"
            description="Get notified when you receive feedback"
            checked={settings.onFeedback}
            onChange={(checked) => setSettings(prev => ({ ...prev, onFeedback: checked }))}
            color="from-purple-500 to-pink-500"
          />

          <NotificationOption
            icon={FileText}
            label="Paper Ready"
            description="Get notified when question papers are ready for download"
            checked={settings.onPaperReady}
            onChange={(checked) => setSettings(prev => ({ ...prev, onPaperReady: checked }))}
            color="from-amber-500 to-orange-500"
          />
        </div>

        <Separator />

        {/* Digest Mode */}
        <div className="space-y-3">
          <Label>Notification Frequency</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'instant', label: 'Instant', desc: 'Get emails immediately' },
              { value: 'daily', label: 'Daily Digest', desc: 'Once per day' },
              { value: 'weekly', label: 'Weekly Digest', desc: 'Once per week' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSettings(prev => ({ ...prev, digestMode: option.value as any }))}
                disabled={!settings.enabled}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.digestMode === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <p className="font-medium text-foreground text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailNotificationSettings;