/**
 * Subscribes to Firestore notifications for the current user (by role) and
 * keeps the question store notifications in sync so HOD receives approval
 * requests and staff receive replies.
 */
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore } from '@/stores/questionStore';
import { isFirebaseConfigured } from '@/services/firebase/firestore-config';
import { firestoreNotificationService } from '@/services/firebase/firestore-database';
import { timestampToDate } from '@/services/firebase/converters';
import type { Notification } from '@/stores/questionStore';
import type { FirestoreNotification } from '@/services/firebase/types';

function mapFirestoreToStore(n: FirestoreNotification): Notification {
  const raw = n as any;
  return {
    ...n,
    id: n.id,
    isRead: n.isRead ?? false,
    createdAt: timestampToDate(raw.createdAt),
  } as Notification;
}

export function FirestoreNotificationsSync() {
  const { user } = useAuth();
  const setNotifications = useQuestionStore((s) => s.setNotifications);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user?.id) return;

    const role = user.role;
    const department = user.role === 'hod' ? user.department : undefined;

    const unsubscribe = firestoreNotificationService.onNotificationsChange(
      (notifications) => {
        let list = notifications.filter((n: any) => !n.deletedByRecipient);
        // Treat empty string as "not set" so we don't accidentally filter out everything.
        if (user.role === 'hod' && user.institution != null && user.institution !== '') list = list.filter((n: any) => !n.institution || n.institution === user.institution);
        if (user.role === 'hod' && user.place != null && user.place !== '') list = list.filter((n: any) => !n.place || n.place === user.place);
        const mapped = list.map(mapFirestoreToStore);
        setNotifications(mapped);
      },
      role,
      department ?? undefined
    );

    return () => unsubscribe();
  }, [user?.id, user?.role, user?.department, user?.institution, user?.place, setNotifications]);

  return null;
}
