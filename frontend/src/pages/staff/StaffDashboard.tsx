import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UploadMaterials from '@/components/staff/UploadMaterials';
import QuestionGenerator from '@/components/staff/QuestionGenerator';
import MyQuestions from '@/components/staff/MyQuestions';
import ApprovalHistory from '@/components/staff/ApprovalHistory';
import AIAssistant from '@/components/staff/AIAssistant';
import NotificationsPanel from '@/components/staff/NotificationsPanel';
import StaffDashboardHome from '@/components/staff/StaffDashboardHome';
import QuestionPaperBuilder from '@/components/staff/QuestionPaperBuilder';
import NotificationSettingsPanel from '@/components/settings/NotificationSettingsPanel';

const StaffDashboard: React.FC = () => {
  const location = useLocation();
  
  return (
    <DashboardLayout>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes>
          <Route index element={<StaffDashboardHome />} />
          <Route path="upload" element={<UploadMaterials />} />
          <Route path="generate" element={<QuestionGenerator />} />
          <Route path="questions" element={<MyQuestions />} />
          <Route path="paper-builder" element={<QuestionPaperBuilder />} />
          <Route path="history" element={<ApprovalHistory />} />
          <Route path="chat" element={<AIAssistant />} />
          <Route path="notifications" element={<NotificationsPanel role="staff" />} />
          <Route path="settings" element={<NotificationSettingsPanel />} />
        </Routes>
      </motion.div>
    </DashboardLayout>
  );
};

export default StaffDashboard;