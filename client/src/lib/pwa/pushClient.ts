/**
 * Standards-based Web Push Browser Client
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Converts a URL-safe Base64 VAPID public key into a Uint8Array required by PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[PushClient] Error reading existing subscription:', err);
    return null;
  }
}

export async function subscribeBrowserPush(
  vapidPublicKey: string
): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Web Push is not supported in this browser.');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  return await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as unknown as BufferSource,
  });
}

export async function unsubscribeBrowserPush(): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (subscription) {
    return await subscription.unsubscribe();
  }
  return false;
}

