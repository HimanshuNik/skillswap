import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminRouteProps {
  requiredRole?: 'ADMIN' | 'MODERATOR';
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role || 'USER';
  const hasAccess =
    role === 'ADMIN' || (role === 'MODERATOR' && requiredRole !== 'ADMIN');

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Administrative Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your current account role (<span className="text-amber-400 font-semibold">{role}</span>) does not have permission to access the SkillSwap administrative platform.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Member Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

