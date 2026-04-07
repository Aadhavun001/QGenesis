import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  MessageSquare,
  CheckCheck,
  Reply,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuestionStore, Notification } from '@/stores/questionStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const HodNotifications: React.FC = () => {
  const { user } = useAuth();
  const { 
    getNotificationsForRole, 
    markNotificationRead, 
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications,
    replyToNotification
  } = useQuestionStore();
  
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Get notifications for HOD, filter by department if available
  const allNotifications = getNotificationsForRole('hod');
  const notifications = user?.department 
    ? allNotifications.filter(n => !n.department || n.department === user.department)
    : allNotifications;
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllNotificationsRead('hod');
    toast.success('All notifications marked as read');
  };

  const handleDeleteAll = () => {
    deleteAllNotifications('hod');
    toast.success('All notifications deleted');
  };

  const handleReply = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowReplyDialog(true);
  };

  const sendReply = () => {
    if (!replyMessage.trim() || !selectedNotification) {
      toast.error('Please enter a reply message');
      return;
    }

    replyToNotification(
      selectedNotification.id,
      replyMessage,
      'hod',
      selectedNotification.fromRole
    );
    
    toast.success('Reply sent successfully');
    setShowReplyDialog(false);
    setReplyMessage('');
    setSelectedNotification(null);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'request':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'reply':
        return <Reply className="w-5 h-5 text-purple-500" />;
      default:
        return <MessageSquare className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`p-4 hover:bg-muted/30 transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{notification.title}</span>
                            {!notification.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              From: {notification.fromRole}
                            </Badge>
                            {notification.department && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.department}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleReply(notification)}
                          >
                            <Reply className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedNotification && (
              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="text-sm font-medium">{selectedNotification.title}</p>
                <p className="text-xs text-muted-foreground">{selectedNotification.message}</p>
              </div>
            )}
            <Textarea
              placeholder="Enter your reply message..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendReply}>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HodNotifications;