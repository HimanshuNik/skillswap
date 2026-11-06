import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type PlatformSettingItem } from '../../lib/adminApi';
import {
  UserPlus,
  AlertOctagon,
  Mail,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface SettingsFormProps {
  initialSettings: Record<string, PlatformSettingItem>;
  onSaved: () => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ initialSettings, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize directly from loaded query props (zero useEffect)
  const [regEnabled, setRegEnabled] = useState(() => initialSettings['registration_enabled']?.value !== 'false');
  const [maintMode, setMaintMode] = useState(() => initialSettings['maintenance_mode']?.value === 'true');
  const [maintMessage, setMaintMessage] = useState(
    () =>
      initialSettings['maintenance_message']?.value ||
      'SkillSwap is undergoing scheduled maintenance. We will be back shortly!'
  );
  const [emailEnabled, setEmailEnabled] = useState(
    () => initialSettings['email_notifications_enabled']?.value !== 'false'
  );
  const [maxReports, setMaxReports] = useState(
    () => initialSettings['max_reports_per_hour']?.value || '5'
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      await adminApi.updateSettings({
        registration_enabled: regEnabled ? 'true' : 'false',
        maintenance_mode: maintMode ? 'true' : 'false',
        maintenance_message: maintMessage.trim(),
        email_notifications_enabled: emailEnabled ? 'true' : 'false',
        max_reports_per_hour: maxReports.trim(),
      });
      setSavedSuccess(true);
      onSaved();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to persist platform settings';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Registration Governance */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Member Onboarding & Registration</h2>
            <p className="text-xs text-slate-400">Controls whether new users can register accounts</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800/80">
          <div>
            <div className="font-semibold text-xs text-white">Public Account Registration</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When disabled, all registration endpoints return 403 Forbidden.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={regEnabled}
              onChange={(e) => setRegEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Maintenance Mode & Public Notice</h2>
            <p className="text-xs text-slate-400">Broadcast temporary maintenance banners across the platform</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800/80">
          <div>
            <div className="font-semibold text-xs text-white">Maintenance Mode Active</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Renders a sticky public notice banner warning members of active system maintenance.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={maintMode}
              onChange={(e) => setMaintMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Public Maintenance Message</label>
          <input
            type="text"
            value={maintMessage}
            onChange={(e) => setMaintMessage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Global Notifications & Anti-Spam */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Email Dispatch & Anti-Spam Thresholds</h2>
            <p className="text-xs text-slate-400">Configure transactional queues and report throttling</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800/80">
          <div>
            <div className="font-semibold text-xs text-white">Global Email Delivery Dispatch</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Master switch for background email queue dispatching.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Max Member Reports per Hour</label>
          <input
            type="number"
            min="1"
            max="50"
            value={maxReports}
            onChange={(e) => setMaxReports(e.target.value)}
            className="w-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Feedback / Save Actions */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Platform configurations successfully saved and synchronized.
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Changes...' : 'Save Platform Settings'}
        </button>
      </div>
    </form>
  );
};

export const AdminSettings: React.FC = () => {
  const { data: initialSettings, isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  });

  if (isLoading || !initialSettings) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading system configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration & Controls</h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust runtime governance flags, registration policies, and platform availability modes.
        </p>
      </div>

      <SettingsForm initialSettings={initialSettings} onSaved={() => refetch()} />
    </div>
  );
};
