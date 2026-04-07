import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Reply,
  RotateCcw,
  Globe,
  ShieldAlert,
  Unlock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

const NotificationSettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useNotificationSettingsStore();
  const { isSupported, permission, requestPermission, sendNotification } = useBrowserNotifications();
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isSupported) {
      setBrowserPermission(Notification.permission);
    }
  }, [isSupported]);

  const handleTestSound = () => {
    if (settings.soundEnabled) {
      playNotificationSound();
      toast.success('Notification sound played!');
    } else {
      toast.error('Sound is disabled. Enable it first to test.');
    }
  };

  const handleReset = () => {
    resetSettings();
    toast.success('Notification settings reset to defaults');
  };

  const handleRequestBrowserPermission = async () => {
    const granted = await requestPermission();
    setBrowserPermission(Notification.permission);
    if (granted) {
      toast.success('Browser notifications enabled!');
      updateSettings({ browserNotificationsEnabled: true });
    } else {
      toast.error('Browser notification permission denied');
    }
  };

  const handleTestBrowserNotification = () => {
    const success = sendNotification('🔓 Test Unlock Request', {
      body: 'This is a test notification for unlock requests.',
      tag: 'test-notification',
    });
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Could not send notification. Check browser permissions.');
    }
  };

  const getPermissionBadge = () => {
    switch (browserPermission) {
      case 'granted':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Enabled</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Blocked</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Not Set</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notification Settings</h2>
          <p className="text-muted-foreground">Customize your notification preferences</p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sound Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              Sound Alerts
            </CardTitle>
            <CardDescription>Configure notification sound preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled" className="flex flex-col gap-1">
                <span>Enable Sound</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Play a sound when new notifications arrive
                </span>
              </Label>
              <Switch
                id="sound-enabled"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Volume</Label>
                <span className="text-sm text-muted-foreground">{settings.soundVolume}%</span>
              </div>
              <Slider
                value={[settings.soundVolume]}
                onValueChange={([v]) => updateSettings({ soundVolume: v })}
                min={0}
                max={100}
                step={10}
                disabled={!settings.soundEnabled}
              />
            </div>

            <Button 
              variant="outline" 
              onClick={handleTestSound}
              disabled={!settings.soundEnabled}
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              Test Sound
            </Button>
          </CardContent>
        </Card>

        {/* Toast Settings */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Toast Popups
            </CardTitle>
            <CardDescription>Configure visual notification popups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="toast-enabled" className="flex flex-col gap-1">
                <span>Enable Toast Popups</span>
                <span className="text-xs text-muted-foreground font-normal">
                  Show visual popups for new notifications
                </span>
              </Label>
              <Switch
                id="toast-enabled"
                checked={settings.toastEnabled}
                onCheckedChange={(checked) => updateSettings({ toastEnabled: checked })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Display Duration</Label>
                <span className="text-sm text-muted-foreground">{settings.toastDuration}s</span>
              </div>
              <Slider
                value={[settings.toastDuration]}
                onValueChange={([v]) => updateSettings({ toastDuration: v })}
                min={2}
                max={10}
                step={1}
                disabled={!settings.toastEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Browser Push Notifications */}
      <Card className="border-border/50 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Browser Push Notifications
            {getPermissionBadge()}
          </CardTitle>
          <CardDescription>
            Get notified even when the app is in the background. Perfect for HODs to catch unlock requests instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSupported ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>Your browser doesn't support push notifications.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="browser-notifications" className="flex flex-col gap-1">
                  <span>Enable Browser Notifications</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Receive push notifications for important events
                  </span>
                </Label>
              <Switch
                id="browser-notifications"
                checked={settings.browserNotificationsEnabled}
                onCheckedChange={async (checked) => {
                  updateSettings({ browserNotificationsEnabled: checked });
                  if (checked && browserPermission !== 'granted') {
                    await handleRequestBrowserPermission();
                  }
                }}
                disabled={browserPermission === 'denied'}
              />
              </div>

              {browserPermission === 'default' && (
                <Button onClick={handleRequestBrowserPermission} className="w-full">
                  <Bell className="w-4 h-4 mr-2" />
                  Allow Browser Notifications
                </Button>
              )}

              {browserPermission === 'denied' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                  Browser notifications are blocked. Please enable them in your browser settings.
                </div>
              )}

              {browserPermission === 'granted' && (
                <Button 
                  variant="outline" 
                  onClick={handleTestBrowserNotification}
                  className="w-full"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Test Browser Notification
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>Choose which notification types to receive alerts for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <Label htmlFor="approval-alerts" className="flex items-center gap-3 cursor-pointer">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Approvals</span>
              </Label>
              <Switch
                id="approval-alerts"
                checked={settings.showApprovalAlerts}
                onCheckedChange={(checked) => updateSettings({ showApprovalAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <Label htmlFor="rejection-alerts" className="flex items-center gap-3 cursor-pointer">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>Rejections</span>
              </Label>
              <Switch
                id="rejection-alerts"
                checked={settings.showRejectionAlerts}
                onCheckedChange={(checked) => updateSettings({ showRejectionAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <Label htmlFor="reply-alerts" className="flex items-center gap-3 cursor-pointer">
                <Reply className="w-5 h-5 text-blue-500" />
                <span>Replies</span>
              </Label>
              <Switch
                id="reply-alerts"
                checked={settings.showReplyAlerts}
                onCheckedChange={(checked) => updateSettings({ showReplyAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <Label htmlFor="request-alerts" className="flex items-center gap-3 cursor-pointer">
                <Bell className="w-5 h-5 text-primary" />
                <span>Requests</span>
              </Label>
              <Switch
                id="request-alerts"
                checked={settings.showRequestAlerts}
                onCheckedChange={(checked) => updateSettings({ showRequestAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Label htmlFor="unlock-alerts" className="flex items-center gap-3 cursor-pointer">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Unlock Requests</span>
              </Label>
              <Switch
                id="unlock-alerts"
                checked={settings.showUnlockAlerts}
                onCheckedChange={(checked) => updateSettings({ showUnlockAlerts: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NotificationSettingsPanel;
