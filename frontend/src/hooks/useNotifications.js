import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../services/endpoints';

export const NOTIFICATIONS_CHANGED = 'fintrack:notifications-changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

const POLL_MS = 20000;

// Polls for new alerts (and refreshes right away when another part of the app changes them).
export default function useNotifications(limit = 6) {
  const [state, setState] = useState({ items: [], unreadCount: 0, loading: true, error: false });

  const load = useCallback(async () => {
    try {
      const data = await notificationApi.list({ limit });
      setState({ items: data.items, unreadCount: data.unreadCount, loading: false, error: false });
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, [limit]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, load);
    };
  }, [load]);

  return { ...state, reload: load };
}
