import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import useNotifications, { notifyNotificationsChanged } from '../hooks/useNotifications';
import { notificationApi, } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { formatDateTime } from '../utils/format';

export default function NotificationBell() {
  const { items, unreadCount, loading } = useNotifications(6);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (n) => {
    if (n.read) return;
    try {
      await notificationApi.markRead(n.id);
      notifyNotificationsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      notifyNotificationsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy-700 transition-colors hover:bg-slate-50"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-expense px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-navy-900">Notifications</h2>
            {unreadCount > 0 && (
              <button type="button" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={markAll}>
                <CheckCheck className="h-4 w-4" /> Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {loading && <li className="px-4 py-6 text-center text-sm text-navy-500">Loading...</li>}
            {!loading && items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-navy-500">No alerts yet. You will see one here when a single expense goes over your limit.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => markRead(n)} className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/60'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-600'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm text-navy-800">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-navy-500">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
