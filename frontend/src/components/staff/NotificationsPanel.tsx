import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  XCircle,
  Info,
  MessageSquare,
  Check,
  Trash2,
  CheckCheck,
  Reply,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuestionStore, Notification } from '@/stores/questionStore';

interface NotificationsPanelProps {
  role: 'staff' | 'hod' | 'admin';
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ role }) => {
  const { toast } = useToast();
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    deleteNotification,
    deleteAllNotifications,
    replyToNotification
  } = useQuestionStore();

  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Filter notifications for this role
  const roleNotifications = notifications.filter(n => n.toRole === role);
  const unreadCount = roleNotifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllNotificationsRead(role);
    toast({
      title: 'All Marked as Read',
      description: 'All notifications have been marked as read',
    });
  };

  const handleDeleteAll = () => {
    deleteAllNotifications(role);
    setShowDeleteAllDialog(false);
    toast({
      title: 'All Notifications Deleted',
      description: 'All notifications have been removed',
    });
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast({
      title: 'Notification Deleted',
      description: 'The notification has been removed',
    });
  };

  const handleReply = () => {
    if (!selectedNotification || !replyMessage.trim()) return;

    // Determine who to reply to
    const toRole = selectedNotification.fromRole;
    
    replyToNotification(
      selectedNotification.id, 
      replyMessage, 
      role, 
      toRole
    );

    toast({
      title: 'Reply Sent',
      description: `Your reply has been sent to ${toRole.toUpperCase()}`,
    });

    setShowReplyDialog(false);
    setReplyMessage('');
    setSelectedNotification(null);
  };

  const openReplyDialog = (notification: Notification) => {
    setSelectedNotification(notification);
    setReplyMessage('');
    setShowReplyDialog(true);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejection':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'feedback':
        return <MessageSquare className="w-5 h-5 text-amber-500" />;
      case 'request':
        return <Bell className="w-5 h-5 text-primary" />;
      case 'reply':
        return <Reply className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'approval':
        return 'bg-green-500/10';
      case 'rejection':
        return 'bg-red-500/10';
      case 'feedback':
        return 'bg-amber-500/10';
      case 'request':
        return 'bg-primary/10';
      case 'reply':
        return 'bg-blue-500/10';
      default:
        return 'bg-blue-500/10';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Check if notification can be replied to
  const canReply = (notification: Notification) => {
    // Staff can reply to HOD notifications (approval/rejection)
    if (role === 'staff' && notification.fromRole === 'hod') return true;
    // HOD can reply to staff requests
    if (role === 'hod' && notification.fromRole === 'staff') return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        
        {roleNotifications.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteAllDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          </div>
        )}
      </div>

      {roleNotifications.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-3 pr-4">
            <AnimatePresence>
              {roleNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`border-border/50 transition-all ${
                      !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
                    } hover:shadow-md`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getNotificationBg(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground">{notification.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              {notification.replyTo && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  Reply to previous notification
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.isRead && (
                                <Badge className="bg-primary/20 text-primary border-0">
                                  New
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markNotificationRead(notification.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            {canReply(notification) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-500/10"
                                onClick={() => openReplyDialog(notification)}
                              >
                                <Reply className="w-4 h-4 mr-1" />
                                Reply
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}

      {/* Delete All Confirmation */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {roleNotifications.length} notification(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Notification</DialogTitle>
            <DialogDescription>
              Send a response to {selectedNotification?.fromRole.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedNotification && (
              <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium">{selectedNotification.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedNotification.message}</p>
              </div>
            )}
            <Textarea
              placeholder="Type your reply..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyDialog(false)}>Cancel</Button>
            <Button onClick={handleReply} disabled={!replyMessage.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsPanel;
