import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useSession } from "./hooks/useAuth";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";

// Route-level code-splitting with React.lazy
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Matches = lazy(() => import("./pages/Matches"));
const Requests = lazy(() => import("./pages/Requests"));
const Messages = lazy(() => import("./pages/Messages"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const BillingSettings = lazy(() => import("./pages/BillingSettings"));
const LearningRoadmap = lazy(() => import("./pages/LearningRoadmap"));
const LearningAnalytics = lazy(() => import("./pages/LearningAnalytics"));
const Community = lazy(() => import("./pages/Community"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const StudyGroups = lazy(() => import("./pages/StudyGroups"));
const StudyGroupDetail = lazy(() => import("./pages/StudyGroupDetail"));

// Admin routes
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminReports = lazy(() => import("./pages/admin/AdminReports").then(m => ({ default: m.AdminReports })));
const AdminSkills = lazy(() => import("./pages/admin/AdminSkills").then(m => ({ default: m.AdminSkills })));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions").then(m => ({ default: m.AdminSubscriptions })));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs").then(m => ({ default: m.AdminAuditLogs })));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails").then(m => ({ default: m.AdminEmails })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute fresh cache window
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection window
    },
  },
});

function PageFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="flex min-h-[50vh] w-full items-center justify-center p-8"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
        <span className="text-xs font-medium text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  useSession();

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Guest only routes */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/billing" element={<BillingSettings />} />
          <Route path="/learning-roadmap" element={<LearningRoadmap />} />
          <Route path="/learning-analytics" element={<LearningAnalytics />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/posts/:id" element={<CommunityPostDetail />} />
          <Route path="/community/groups" element={<StudyGroups />} />
          <Route path="/community/groups/:id" element={<StudyGroupDetail />} />
          <Route path="/community/groups/:id/sessions" element={<StudyGroupDetail defaultTab="SESSIONS" />} />
          <Route path="/community/groups/:id/resources" element={<StudyGroupDetail defaultTab="RESOURCES" />} />
          <Route path="/community/groups/:id/tasks" element={<StudyGroupDetail defaultTab="TASKS" />} />
          <Route path="/profile/:username" element={<Profile />} />
        </Route>

        {/* Admin & Platform Management routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/skills" element={<AdminSkills />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit" element={<AdminAuditLogs />} />
            <Route path="/admin/emails" element={<AdminEmails />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
