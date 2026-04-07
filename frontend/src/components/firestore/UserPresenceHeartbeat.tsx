import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreUserActivityService } from '@/services/firebase/firestore-database';

/**
 * Lightweight presence ping so Admin Activity Monitor can show online/offline.
 * "Online" is derived from last activity timestamp (see UserActivityMonitor).
 */
export function UserPresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!isFirebaseConfigured() || !user?.id) return;

    let stopped = false;

    const ping = () => {
      if (stopped) return;
      firestoreUserActivityService.create({
        userId: user.id,
        userName: user.displayName ?? user.email ?? user.id,
        email: user.email,
        role: user.role,
        action: 'presence_ping',
        timestamp: new Date(),
      }).catch(() => {});
    };

    // Immediate ping on mount/login
    ping();

    // Ping periodically while tab is open
    const interval = setInterval(ping, 60_000);

    // Ping when user returns to tab / focuses window
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    const onFocus = () => ping();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, user?.role, user?.email, user?.displayName]);

  return null;
}

