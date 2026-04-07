import React, { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/services/firebase/firestore-config";
import {
  firestoreLogoSettingsService,
  firestoreExamTypeService,
  firestoreQuestionTypeService,
} from "@/services/firebase/firestore-database";
import { FirestoreQuestionsSync } from "@/components/firestore/FirestoreQuestionsSync";
import { FirestorePapersSync } from "@/components/firestore/FirestorePapersSync";
import { FirestoreNotificationsSync } from "@/components/firestore/FirestoreNotificationsSync";
import { UserPresenceHeartbeat } from "@/components/firestore/UserPresenceHeartbeat";
import { LocalRealtimeSync } from "@/components/common/LocalRealtimeSync";
import { FaviconSync } from "@/components/common/FaviconSync";
import { useQuestionStore } from "@/stores/questionStore";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import PhoneLogin from "./pages/auth/PhoneLogin";
import StaffDashboard from "./pages/staff/StaffDashboard";
import HodDashboard from "./pages/hod/HodDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import CookiePolicy from "./pages/legal/CookiePolicy";
import SharedChat from "./pages/share/SharedChat";
import AboutUs from "./pages/AboutUs";

// Page transition wrapper
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

// Create query client inside the module but ensure it's a stable reference
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// Protected Route Component - show loading so user never sees a blank white page
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
        <Route path="/auth/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/auth/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/auth/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/auth/phone-login" element={<PageWrapper><PhoneLogin /></PageWrapper>} />
        
        {/* Legal Routes */}
        <Route path="/legal/privacy-policy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
        <Route path="/legal/terms-of-service" element={<PageWrapper><TermsOfService /></PageWrapper>} />
        <Route path="/legal/cookie-policy" element={<PageWrapper><CookiePolicy /></PageWrapper>} />
        <Route path="/about-us" element={<PageWrapper><AboutUs /></PageWrapper>} />

        {/* Public share routes */}
        <Route path="/share/chat/:shareId" element={<PageWrapper><SharedChat /></PageWrapper>} />
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <PageWrapper><StaffDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        <Route path="/staff/*" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <PageWrapper><StaffDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        
        {/* HOD Routes */}
        <Route path="/hod" element={
          <ProtectedRoute allowedRoles={['hod']}>
            <PageWrapper><HodDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        <Route path="/hod/*" element={
          <ProtectedRoute allowedRoles={['hod']}>
            <PageWrapper><HodDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PageWrapper><AdminDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PageWrapper><AdminDashboard /></PageWrapper>
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

// Sync logo from Firestore to localStorage on load so whole app sees admin logo
const LogoFirestoreSync = () => {
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let unsubscribe: null | (() => void) = null;
    let isUnmounted = false;
    (async () => {
      try {
        const { onSnapshot, doc } = await import('firebase/firestore');
        const { db } = await import('@/services/firebase/firestore-config');
        const { COLLECTIONS } = await import('@/services/firebase/collections');
        if (!db) return;

        // Realtime subscribe so all users see logo updates immediately
        const rawUnsubscribe = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'logo'), (snap) => {
          const remote = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
          if (remote && typeof remote === 'object' && Object.keys(remote).length > 0) {
            try {
              localStorage.setItem('qgenesis-logo-settings', JSON.stringify(remote));
              window.dispatchEvent(new CustomEvent('logo-settings-updated'));
            } catch (_) {}
          }
        });
        if (isUnmounted) {
          rawUnsubscribe();
          return;
        }
        unsubscribe = rawUnsubscribe;
      } catch {
        // Fallback to one-time fetch if snapshot fails
        firestoreLogoSettingsService.get().then((remote) => {
          if (remote && typeof remote === 'object' && Object.keys(remote).length > 0) {
            try {
              localStorage.setItem('qgenesis-logo-settings', JSON.stringify(remote));
              window.dispatchEvent(new CustomEvent('logo-settings-updated'));
            } catch (_) {}
          }
        });
      }
    })();

    return () => {
      isUnmounted = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);
  return null;
};

// Hydrate exam types and question types from Firestore when Firebase is configured
const ConfigFirestoreSync = () => {
  const setExamTypes = useQuestionStore((s) => s.setExamTypes);
  const setQuestionTypes = useQuestionStore((s) => s.setQuestionTypes);
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    Promise.all([
      firestoreExamTypeService.getAll(),
      firestoreQuestionTypeService.getAll(),
    ])
      .then(([examTypes, questionTypes]) => {
        if (examTypes.length > 0) setExamTypes(examTypes);
        if (questionTypes.length > 0) setQuestionTypes(questionTypes);
      })
      .catch(() => {});
  }, [setExamTypes, setQuestionTypes]);
  return null;
};

// Scroll restoration component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Only scroll to top if not coming back (handled by browser)
    if (!window.history.state?.usr?.scrollPos) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LogoFirestoreSync />
            <ConfigFirestoreSync />
            <FirestoreQuestionsSync />
            <FirestorePapersSync />
            <FirestoreNotificationsSync />
            <UserPresenceHeartbeat />
            <LocalRealtimeSync />
            <FaviconSync />
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
