import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LandingPage } from './pages/LandingPage/LandinPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PostingsPage } from './pages/postings/PostingsPage';
import { PostingDetailPage } from './pages/postings/PostingDetailPage';
import { CandidatesPage } from './pages/candidates/CandidatesPage';
import { CandidateDetailPage } from './pages/candidates/CandidateDetailPage';
import { PipelinePage } from './pages/pipeline/PipelinePage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { AuditPage } from './pages/admin/AuditPage';
import { HistoryPage } from './pages/postings/HistoryPage';
import { PostingApplicationsPage } from './pages/postings/PostingApplicationsPage';
import { InterviewsPage } from './pages/interviews/InterviewsPage';
import { EmailCandidaturesPage } from './pages/emailCandidatures/EmailCandidaturesPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="postings" element={<PostingsPage />} />
        <Route path="postings/:id" element={<PostingDetailPage />} />
        <Route path="postings/:id/applications" element={<PostingApplicationsPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/:id" element={<CandidateDetailPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="interviews" element={<InterviewsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="email-candidatures" element={<EmailCandidaturesPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
    </Routes>
  );
}

export default App;
