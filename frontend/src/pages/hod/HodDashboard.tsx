import React from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import HodDashboardContent from '@/components/hod/HodDashboardContent';
import HodNotifications from '@/components/hod/HodNotifications';
import StaffOverview from '@/components/hod/StaffOverview';
import PaperReview from '@/components/hod/PaperReview';
import HodApprovalHistory from '@/components/hod/HodApprovalHistory';
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel';
import UnlockRequestsPanel from '@/components/hod/UnlockRequestsPanel';
import HodSubmittedPapers from '@/components/hod/HodSubmittedPapers';
import { useQuestionStore } from '@/stores/questionStore';
import { useAuth } from '@/contexts/AuthContext';
import { useHodUnlockAlerts } from '@/hooks/useHodUnlockAlerts';

const HodDashboard: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { notifications } = useQuestionStore();

  useHodUnlockAlerts({
    notifications,
    userDepartment: user?.department,
    userInstitution: user?.institution,
    userPlace: user?.place,
  });

  const renderContent = () => {
    const path = location.pathname;
    
    if (path.includes('/hod/settings')) return <NotificationSettingsPanel />;
    if (path.includes('/hod/notifications')) return <HodNotifications />;
    if (path.includes('/hod/staff')) return <StaffOverview />;
    if (path.includes('/hod/review') || path.includes('/hod/papers')) return <PaperReview />;
    if (path.includes('/hod/history')) return <HodApprovalHistory />;
    if (path.includes('/hod/security') || path.includes('/hod/unlock')) return <UnlockRequestsPanel />;
    if (path.includes('/hod/submitted-papers')) return <HodSubmittedPapers />;
    
    return <HodDashboardContent />;
  };

  return (
    <DashboardLayout>
      {renderContent()}
    </DashboardLayout>
  );
};

export default HodDashboard;
