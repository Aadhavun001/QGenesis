import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number;
  toastEnabled: boolean;
  toastDuration: number; // in seconds
  showApprovalAlerts: boolean;
  showRejectionAlerts: boolean;
  showReplyAlerts: boolean;
  showRequestAlerts: boolean;
  browserNotificationsEnabled: boolean;
  showUnlockAlerts: boolean;
}

interface NotificationSettingsStore {
  settings: NotificationSettings;
  updateSettings: (updates: Partial<NotificationSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 50,
  toastEnabled: true,
  toastDuration: 5,
  showApprovalAlerts: true,
  showRejectionAlerts: true,
  showReplyAlerts: true,
  showRequestAlerts: true,
  browserNotificationsEnabled: true,
  showUnlockAlerts: true,
};

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () =>
        set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'qgenesis-notification-settings',
    }
  )
);
