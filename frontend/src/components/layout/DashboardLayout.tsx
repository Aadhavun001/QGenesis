import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  LayoutDashboard, 
  FileText, 
  Upload, 
  CheckSquare, 
  History, 
  MessageSquare, 
  Users, 
  Settings, 
  Bell, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionStore } from '@/stores/questionStore';
import ThemeToggle from '@/components/layout/ThemeToggle';
import ProfileSettings from '@/components/profile/ProfileSettings';
import ProfileSetupWizard from '@/components/common/ProfileSetupWizard';
import { cn } from '@/lib/utils';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { getLogoShapeClass } from '@/utils/logoShape';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { settings } = useAppSettingsStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const { notifications } = useQuestionStore();

  // Check if profile is incomplete and show wizard
  useEffect(() => {
    if (user) {
      const isProfileIncomplete = !user.department || !user.institution || !user.place;
      const hasSeenWizard = localStorage.getItem(`profile-wizard-dismissed-${user.id}`);
      
      if (isProfileIncomplete && !hasSeenWizard) {
        // Show wizard after a small delay to not interrupt initial load
        const timer = setTimeout(() => {
          setShowProfileWizard(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Get logo settings with live updates
  const [logoSettings, setLogoSettings] = useState<any>(null);

  React.useEffect(() => {
    const loadLogoSettings = () => {
      try {
        const stored = localStorage.getItem('qgenesis-logo-settings');
        if (stored) {
          setLogoSettings(JSON.parse(stored));
        }
      } catch {}
    };

    loadLogoSettings();

    // Listen for logo updates
    const handleLogoUpdate = () => loadLogoSettings();
    window.addEventListener('logo-settings-updated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logo-settings-updated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, []);
  const appName = settings.branding.appName;

  // Calculate unread notifications for staff and hod
  const getUnreadCount = (role: string) => {
    return notifications.filter(n => n.toRole === role && !n.isRead).length;
  };
  
  const staffUnreadCount = getUnreadCount('staff');
  const hodUnreadCount = getUnreadCount('hod');

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const getNavItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: `/${user?.role}` },
    ];

    if (user?.role === 'staff') {
      return [
        ...baseItems,
        { icon: Upload, label: 'Upload Materials', path: '/staff/upload' },
        { icon: Sparkles, label: 'Generate Questions', path: '/staff/generate' },
        { icon: FileText, label: 'My Questions', path: '/staff/questions' },
        { icon: FileText, label: 'Paper Builder', path: '/staff/paper-builder' },
        { icon: History, label: 'Approval History', path: '/staff/history' },
        { icon: MessageSquare, label: 'AI Assistant', path: '/staff/chat' },
        { icon: Bell, label: 'Notifications', path: '/staff/notifications' },
        { icon: Settings, label: 'Settings', path: '/staff/settings' },
      ];
    }

    if (user?.role === 'hod') {
      return [
        ...baseItems,
        { icon: FileText, label: 'Paper Review', path: '/hod/review' },
        { icon: FileText, label: 'Submitted Papers', path: '/hod/submitted-papers' },
        { icon: CheckSquare, label: 'Question Review', path: '/hod#pending-reviews', scrollTo: 'pending-reviews' },
        { icon: Users, label: 'Staff Overview', path: '/hod/staff' },
        { icon: ShieldCheck, label: 'Security & Unlock', path: '/hod/security' },
        { icon: History, label: 'Approval History', path: '/hod/history' },
        { icon: Bell, label: 'Notifications', path: '/hod/notifications' },
        { icon: Settings, label: 'Settings', path: '/hod/settings' },
      ];
    }

    if (user?.role === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin?tab=overview' },
        { icon: Users, label: 'User Management', path: '/admin?tab=activity' },
        { icon: Settings, label: 'Role Manager', path: '/admin?tab=roles' },
        { icon: ShieldCheck, label: 'Security', path: '/admin?tab=security' },
        { icon: FileText, label: 'Exam Types', path: '/admin?tab=exams' },
        { icon: Settings, label: 'App Settings', path: '/admin?tab=settings' },
        { icon: Sparkles, label: 'App Logo', path: '/admin?tab=logo' },
        { icon: BarChart3, label: 'Analytics', path: '/admin?tab=analytics' },
        { icon: Bell, label: 'Alerts', path: '/admin?tab=alerts' },
        { icon: Mail, label: 'Email Settings', path: '/admin?tab=email' },
        { icon: FileText, label: 'Submitted Papers', path: '/admin?tab=papers' },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Get dashboard color from user settings - force re-render on user changes
  const [colorState, setColorState] = useState({
    dashboardColor: (user as any)?.dashboardColor || 'default',
    customGradientStart: (user as any)?.customGradientStart || '',
    customGradientEnd: (user as any)?.customGradientEnd || '',
  });

  // Update color state when user changes
  useEffect(() => {
    if (user) {
      setColorState({
        dashboardColor: (user as any)?.dashboardColor || 'default',
        customGradientStart: (user as any)?.customGradientStart || '',
        customGradientEnd: (user as any)?.customGradientEnd || '',
      });
    }
  }, [user, (user as any)?.dashboardColor, (user as any)?.customGradientStart, (user as any)?.customGradientEnd]);

  // Listen for user updates
  useEffect(() => {
    const handleUserUpdate = () => {
      const storedUser = sessionStorage.getItem('qgenesis_user') ?? localStorage.getItem('qgenesis_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setColorState({
            dashboardColor: parsed.dashboardColor || 'default',
            customGradientStart: parsed.customGradientStart || '',
            customGradientEnd: parsed.customGradientEnd || '',
          });
        } catch {}
      }
    };

    window.addEventListener('user-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const { dashboardColor, customGradientStart, customGradientEnd } = colorState;

  const getRoleColor = () => {
    // If user has a custom gradient, return a special marker
    if (dashboardColor === 'custom' && customGradientStart && customGradientEnd) {
      return 'custom';
    }
    
    // If user has a preset dashboard color, use it
    if (dashboardColor && dashboardColor !== 'default') {
      const colorMap: Record<string, string> = {
        purple: 'from-purple-500 to-pink-500',
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-green-500 to-emerald-500',
        orange: 'from-orange-500 to-amber-500',
        rose: 'from-rose-500 to-pink-500',
        indigo: 'from-indigo-500 to-violet-500',
        teal: 'from-teal-500 to-cyan-500',
      };
      if (colorMap[dashboardColor]) {
        return colorMap[dashboardColor];
      }
    }
    
    // Default role-based colors
    switch (user?.role) {
      case 'admin': return 'from-orange-500 to-amber-500';
      case 'hod': return 'from-purple-500 to-pink-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  // Get custom gradient style for inline styles
  const getCustomGradientStyle = () => {
    if (dashboardColor === 'custom' && customGradientStart && customGradientEnd) {
      return { background: `linear-gradient(to bottom right, ${customGradientStart}, ${customGradientEnd})` };
    }
    return {};
  };

  // Get custom gradient for horizontal direction (for nav items)
  const getCustomGradientStyleHorizontal = () => {
    if (dashboardColor === 'custom' && customGradientStart && customGradientEnd) {
      return { background: `linear-gradient(to right, ${customGradientStart}, ${customGradientEnd})` };
    }
    return {};
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3">
              <div 
                className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden',
                  // Only show role gradient behind default/text logo. For image logos we want a clean, gapless fill.
                  logoSettings?.type !== 'image' && getRoleColor() !== 'custom' ? `bg-gradient-to-br ${getRoleColor()}` : '',
                  logoSettings?.type !== 'image' && getRoleColor() === 'custom' ? '' : '',
                  logoSettings?.type === 'image' ? 'bg-transparent' : '',
                ].filter(Boolean).join(' ')}
                style={logoSettings?.type !== 'image' && getRoleColor() === 'custom' ? getCustomGradientStyle() : {}}
              >
                {logoSettings?.type === 'image' && logoSettings?.imageUrl ? (
                  <img
                    src={logoSettings.imageUrl}
                    alt={appName}
                    className={`w-full h-full object-cover ${getLogoShapeClass(logoSettings.shape)}`}
                    style={{
                      filter: `brightness(${logoSettings.brightness || 100}%) contrast(${logoSettings.contrast || 100}%) saturate(${logoSettings.saturate || 100}%) hue-rotate(${logoSettings.hueRotate || 0}deg)`
                    }}
                  />
                ) : (
                  <Brain className="w-6 h-6 text-white" />
                )}
              </div>
              {logoSettings?.type === 'text' && logoSettings?.text ? (
                <span className="text-xl font-bold">
                  {logoSettings.text.split('').map((letter: string, index: number) => (
                    <span
                      key={index}
                      style={{ color: logoSettings.letterColors?.[index % logoSettings.letterColors.length] || 'inherit' }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-xl font-bold text-foreground">{appName}</span>
              )}
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border">
            <button
              onClick={() => setShowProfileSettings(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <Avatar className="border-2 border-primary/20 overflow-hidden rounded-full bg-muted">
                {(user as any)?.avatar && !(user as any)?.useDefaultAvatar ? (
                  <div className="w-full h-full relative overflow-hidden rounded-full">
                    <img 
                      src={(user as any).avatar} 
                      alt={user?.displayName} 
                      className="absolute inset-0 w-full h-full object-cover rounded-full"
                      style={{
                        transform: `scale(${(user as any).avatarZoom || 1}) translate(${((user as any).avatarPosition?.x || 0) / ((user as any).avatarZoom || 1)}px, ${((user as any).avatarPosition?.y || 0) / ((user as any).avatarZoom || 1)}px)`,
                        transformOrigin: 'center center'
                      }}
                    />
                  </div>
                ) : (
                  <AvatarFallback 
                    className={`${getRoleColor() !== 'custom' ? `bg-gradient-to-br ${getRoleColor()}` : ''} text-white`}
                    style={getRoleColor() === 'custom' ? getCustomGradientStyle() : {}}
                  >
                    {user?.displayName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-foreground truncate">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <User className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
              // Handle query param paths for admin
              const itemPathBase = item.path.split('?')[0].split('#')[0];
              const itemTab = item.path.includes('?tab=') ? item.path.split('?tab=')[1] : null;
              const itemScrollTo = (item as any).scrollTo;
              const currentTab = new URLSearchParams(location.search).get('tab');
              
              // Dashboard is only active when on the base path with no tab query
              const isDashboardItem = item.label === 'Dashboard';
              
              const isActive = isDashboardItem
                ? (location.pathname === item.path && !currentTab)
                : itemTab 
                  ? (location.pathname === itemPathBase && currentTab === itemTab)
                  : itemScrollTo
                    ? (location.pathname === itemPathBase && location.hash === `#${itemScrollTo}`)
                    : (location.pathname === item.path || 
                        (item.path !== `/${user?.role}` && location.pathname.startsWith(item.path) && !location.search));
              
              // Check if this is a notifications item and get unread count
              const isNotificationItem = item.label === 'Notifications';
              const unreadCount = isNotificationItem 
                ? (user?.role === 'staff' ? staffUnreadCount : user?.role === 'hod' ? hodUnreadCount : 0)
                : 0;
              
              const handleNavClick = (e: React.MouseEvent) => {
                setSidebarOpen(false);
                
                // Handle scroll-to navigation
                if (itemScrollTo) {
                  e.preventDefault();
                  const targetPath = itemPathBase;
                  
                  if (location.pathname === targetPath) {
                    // Already on the page, just scroll
                    const element = document.getElementById(itemScrollTo);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  } else {
                    // Navigate first, then scroll
                    navigate(targetPath);
                    setTimeout(() => {
                      const element = document.getElementById(itemScrollTo);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }
                }
              };
              
              return (
                <Link
                  key={item.path}
                  to={itemScrollTo ? itemPathBase : item.path}
                  onClick={handleNavClick}
                  className="relative"
                >
                  <motion.div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? getRoleColor() !== 'custom' 
                          ? `bg-gradient-to-r ${getRoleColor()} text-white shadow-lg`
                          : "text-white shadow-lg"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    style={isActive && getRoleColor() === 'custom' ? getCustomGradientStyleHorizontal() : {}}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {/* Red dot indicator for unread notifications */}
                      <AnimatePresence>
                        {isNotificationItem && unreadCount > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-medium">{item.label}</span>
                    {/* Show unread count badge */}
                    {isNotificationItem && unreadCount > 0 && !isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-lg border-b border-border">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      {/* Profile Settings Modal */}
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
      
      {/* Profile Setup Wizard */}
      <ProfileSetupWizard 
        isOpen={showProfileWizard} 
        onClose={() => {
          setShowProfileWizard(false);
          if (user) {
            localStorage.setItem(`profile-wizard-dismissed-${user.id}`, 'true');
          }
        }}
        onComplete={() => {
          if (user) {
            localStorage.setItem(`profile-wizard-dismissed-${user.id}`, 'true');
          }
        }}
      />
    </div>
  );
};

export default DashboardLayout;
