import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { playNotificationSound } from './useNotificationSound';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { Notification } from '@/stores/questionStore';
import { CheckCircle, XCircle, Bell, Reply, MessageSquare, Lock, Unlock, ShieldAlert } from 'lucide-react';
import React from 'react';

interface UseNotificationAlertsOptions {
  notifications: Notification[];
  role: 'staff' | 'hod' | 'admin';
}

export const useNotificationAlerts = ({ notifications, role }: UseNotificationAlertsOptions) => {
  const { settings } = useNotificationSettingsStore();
  const previousNotificationIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  useEffect(() => {
    // Filter notifications for this role
    const roleNotifications = notifications.filter(n => n.toRole === role);
    const currentIds = new Set(roleNotifications.map(n => n.id));

    // On first render, just store current IDs without alerting
    if (!isInitialized.current) {
      previousNotificationIds.current = currentIds;
      isInitialized.current = true;
      return;
    }

    // Find new notifications
    const newNotifications = roleNotifications.filter(
      n => !previousNotificationIds.current.has(n.id) && !n.isRead
    );

    // Alert for each new notification
    newNotifications.forEach(notification => {
      const shouldAlert = checkShouldAlert(notification.type, settings);
      
      if (shouldAlert) {
        // Play sound
        if (settings.soundEnabled) {
          playNotificationSound();
        }

        // Show toast
        if (settings.toastEnabled) {
          showNotificationToast(notification, settings.toastDuration);
        }
      }
    });

    // Update stored IDs
    previousNotificationIds.current = currentIds;
  }, [notifications, role, settings]);
};

const checkShouldAlert = (
  type: Notification['type'],
  settings: {
    showApprovalAlerts: boolean;
    showRejectionAlerts: boolean;
    showReplyAlerts: boolean;
    showRequestAlerts: boolean;
  }
): boolean => {
  switch (type) {
    case 'approval':
      return settings.showApprovalAlerts;
    case 'rejection':
      return settings.showRejectionAlerts;
    case 'reply':
      return settings.showReplyAlerts;
    case 'request':
      return settings.showRequestAlerts;
    default:
      return true;
  }
};

const showNotificationToast = (notification: Notification, duration: number) => {
  const getToastStyle = () => {
    // Check for unlock-related notifications
    const isUnlockRequest = notification.title.toLowerCase().includes('unlock request');
    const isUnlockApproved = notification.title.toLowerCase().includes('unlock approved');
    const isUnlockDenied = notification.title.toLowerCase().includes('unlock') && notification.type === 'rejection';
    const isRelocked = notification.title.toLowerCase().includes('re-locked') || notification.title.toLowerCase().includes('relocked');

    if (isUnlockRequest) {
      return { icon: React.createElement(ShieldAlert, { className: 'w-5 h-5 text-amber-500' }) };
    }
    if (isUnlockApproved) {
      return { icon: React.createElement(Unlock, { className: 'w-5 h-5 text-green-500' }) };
    }
    if (isUnlockDenied) {
      return { icon: React.createElement(Lock, { className: 'w-5 h-5 text-red-500' }) };
    }
    if (isRelocked) {
      return { icon: React.createElement(Lock, { className: 'w-5 h-5 text-purple-500' }) };
    }

    switch (notification.type) {
      case 'approval':
        return { icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-green-500' }) };
      case 'rejection':
        return { icon: React.createElement(XCircle, { className: 'w-5 h-5 text-red-500' }) };
      case 'reply':
        return { icon: React.createElement(Reply, { className: 'w-5 h-5 text-blue-500' }) };
      case 'request':
        return { icon: React.createElement(Bell, { className: 'w-5 h-5 text-primary' }) };
      case 'feedback':
        return { icon: React.createElement(MessageSquare, { className: 'w-5 h-5 text-amber-500' }) };
      default:
        return { icon: React.createElement(Bell, { className: 'w-5 h-5 text-primary' }) };
    }
  };

  const style = getToastStyle();

  toast(notification.title, {
    description: notification.message,
    icon: style.icon,
    duration: duration * 1000,
    action: {
      label: 'View',
      onClick: () => {
        // Could navigate to notifications panel
      },
    },
  });
};
