import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Laptop,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
  getExistingPushSubscription,
} from '../../lib/pwa/pushClient';
import { pwaApi, type DeviceSubscriptionItem } from '../../lib/pwaApi';

interface PushNotificationManagerProps {
  pushEnabled: boolean;
  onTogglePushEnabled: (enabled: boolean) => Promise<void>;
  isUpdatingPrefs?: boolean;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  pushEnabled,
  onTogglePushEnabled,
  isUpdatingPrefs = false,
}) => {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [devices, setDevices] = useState<DeviceSubscriptionItem[]>([]);

  const checkStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setSupported(false);
      return;
    }

    setPermission(getNotificationPermission());
    const existing = await getExistingPushSubscription();
    setIsSubscribed(!!existing);

    try {
      const subs = await pwaApi.getSubscriptions();
      setDevices(subs);
    } catch {
      // Ignore initial subscription list fetch error
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!isPushSupported()) {
      Promise.resolve().then(() => {
        if (active) setSupported(false);
      });
      return;
    }

    Promise.resolve().then(async () => {
      if (!active) return;
      setPermission(getNotificationPermission());
      const existing = await getExistingPushSubscription();
      if (!active) return;
      setIsSubscribed(!!existing);

      try {
        const subs = await pwaApi.getSubscriptions();
        if (!active) return;
        setDevices(subs);
      } catch {
        // Ignore initial subscription list fetch error
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      // 1. Fetch public VAPID key
      const publicKey = await pwaApi.getPublicKey();

      // 2. Request browser permission and subscribe
      const subscription = await subscribeBrowserPush(publicKey);

      // 3. Register with backend
      await pwaApi.subscribe(subscription);

      // 4. Update user preference if not already enabled
      if (!pushEnabled) {
        await onTogglePushEnabled(true);
      }

      toast.success('Browser push notifications enabled! 🔔');
      await checkStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable push notifications';
      toast.error(message);
      setPermission(getNotificationPermission());
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setLoading(true);
    try {
      const existing = await getExistingPushSubscription();
      if (existing) {
        await pwaApi.unsubscribe(existing.endpoint);
        await unsubscribeBrowserPush();
      }

      await onTogglePushEnabled(false);
      toast.success('Push notifications disabled.');
      await checkStatus();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to disable push notifications';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTesting(true);
    try {
      const res = await pwaApi.sendTestPush();
      if (res.sentCount > 0) {
        toast.success('Test notification sent! Check your system notification tray.');
      } else {
        toast.error('No active devices received the test notification.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send test push notification';
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveDevice = async (endpoint: string) => {
    try {
      await pwaApi.unsubscribe(endpoint);
      toast.success('Device removed.');
      setDevices((prev) => prev.filter((d) => d.endpoint !== endpoint));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove device';
      toast.error(message);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <AlertCircle className="h-4 w-4 text-slate-500" /> Web Push is not supported
        </p>
        <p className="mt-1">
          This browser environment does not support background push notifications. You will still receive in-app alerts and notifications while SkillSwap is open.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Master Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
                isSubscribed && pushEnabled ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-700'
              }`}
            >
              {isSubscribed && pushEnabled ? (
                <BellRing className="h-5 w-5 animate-pulse" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Browser Push Notifications
                </h3>
                {isSubscribed && pushEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Disabled
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Receive instant desktop and mobile notifications for swap requests, direct messages, and upcoming sessions even when SkillSwap is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isSubscribed && pushEnabled ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  {testing ? 'Sending...' : 'Test Alert'}
                </button>
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={loading || isUpdatingPrefs}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
                >
                  Disable Push
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={loading || isUpdatingPrefs}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5" />
                {loading ? 'Enabling...' : 'Enable Push Notifications'}
              </button>
            )}
          </div>
        </div>

        {permission === 'denied' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300">
            <p className="font-semibold">⚠️ Notification Permission Blocked</p>
            <p className="mt-0.5 text-[11px]">
              Your browser has blocked notifications for this site. Click the lock/info icon in your browser address bar to reset permissions to "Allow".
            </p>
          </div>
        )}
      </div>

      {/* Registered Devices List */}
      {devices.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Registered Devices ({devices.length})
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Active push endpoints registered to your SkillSwap account.
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between py-2.5 text-xs text-slate-600 dark:text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="font-medium truncate max-w-xs sm:max-w-md">
                      {device.userAgent || 'Web Browser'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Registered: {new Date(device.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDevice(device.endpoint)}
                  title="Remove device subscription"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
