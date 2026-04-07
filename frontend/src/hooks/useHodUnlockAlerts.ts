import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { playNotificationSound } from './useNotificationSound';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { useBrowserNotifications } from './useBrowserNotifications';
import { Notification } from '@/stores/questionStore';
import { ShieldAlert } from 'lucide-react';
import React from 'react';

interface UseHodUnlockAlertsOptions {
  notifications: Notification[];
  userDepartment?: string;
  userInstitution?: string;
  userPlace?: string;
}

export const useHodUnlockAlerts = ({
  notifications,
  userDepartment,
  userInstitution,
  userPlace,
}: UseHodUnlockAlertsOptions) => {
  const { settings } = useNotificationSettingsStore();
  const { sendNotification, requestPermission, isSupported } = useBrowserNotifications();
  const previousRequestIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);
  const hasRequestedPermission = useRef(false);

  // Request permission only when browser notifications are enabled by user preference.
  useEffect(() => {
    if (isSupported && settings.browserNotificationsEnabled && !hasRequestedPermission.current) {
      requestPermission();
      hasRequestedPermission.current = true;
    }
  }, [isSupported, requestPermission, settings.browserNotificationsEnabled]);

  useEffect(() => {
    // Filter for unlock requests targeted at HOD
    const unlockRequests = notifications.filter(n => {
      if (n.type !== 'request' || n.toRole !== 'hod') return false;
      
      const isUnlockRequest = n.title.toLowerCase().includes('unlock request') || 
                              n.title.toLowerCase().includes('unlock');
      if (!isUnlockRequest) return false;

      // Department matching (if set)
      if (userDepartment && n.department && n.department !== userDepartment) return false;
      if (userInstitution && n.institution && n.institution !== userInstitution) return false;
      if (userPlace && n.place && n.place !== userPlace) return false;

      return true;
    });

    const currentIds = new Set(unlockRequests.map(n => n.id));

    // On first render, just store current IDs
    if (!isInitialized.current) {
      previousRequestIds.current = currentIds;
      isInitialized.current = true;
      return;
    }

    // Find new unlock requests
    const newRequests = unlockRequests.filter(
      n => !previousRequestIds.current.has(n.id) && !n.isRead
    );

    // Alert for each new unlock request
    newRequests.forEach(request => {
      // Play sound
      if (settings.soundEnabled) {
        playNotificationSound();
      }

      // Show in-app toast
      if (settings.toastEnabled) {
        toast(request.title, {
          description: request.message,
          icon: React.createElement(ShieldAlert, { className: 'w-5 h-5 text-amber-500' }),
          duration: (settings.toastDuration || 5) * 1000,
          action: {
            label: 'Review',
            onClick: () => {
              // Scroll to unlock requests section
              document.getElementById('unlock-requests')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            },
          },
        });
      }

      // Send browser push notification only when enabled in settings.
      if (settings.browserNotificationsEnabled) {
        sendNotification('🔓 New Unlock Request', {
          body: request.message,
          tag: `unlock-${request.id}`,
          requireInteraction: true,
        });
      }
    });

    previousRequestIds.current = currentIds;
  }, [notifications, userDepartment, userInstitution, userPlace, settings, sendNotification]);
};
