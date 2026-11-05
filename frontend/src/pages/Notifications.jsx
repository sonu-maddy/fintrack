import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationApi } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { notifyNotificationsChanged } from '../hooks/useNotifications';
import { formatDateTime } from '../utils/format';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const LIMIT = 15;

export default function Notifications() {
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await notificationApi.list({ page, limit: LIMIT, ...(tab === 'unread' ? { unread: 'true' } : {}) });
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (n) => {
    try {
      await notificationApi.markRead(n.id);
      notifyNotificationsChanged();
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      toast.success('All notifications marked as read');
      notifyNotificationsChanged();
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const switchTab = (next) => { setTab(next); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-navy-500">Alerts for single expenses above your limit.</p>
        </div>
        {data?.unreadCount > 0 && (
          <button type="button" className="btn-secondary" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all as read</button>
        )}
      </div>

      <div className="inline-flex rounded-xl bg-slate-200/70 p-1" role="tablist">
        {[['all', 'All'], ['unread', 'Unread']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => switchTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${tab === key ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-600 hover:text-navy-900'}`}>
            {label}{key === 'unread' && data?.unreadCount ? ` (${data.unreadCount})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card overflow-hidden">
          {loading && !data ? (
            <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'You are all caught up' : 'No alerts yet'}
              text={tab === 'unread' ? 'There are no unread notifications.' : 'When a single expense goes over your limit, you will see it here.'}
              action={<Link to="/settings" className="btn-secondary">Review your alert limit</Link>}
            />
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <ul className="divide-y divide-slate-100">
                {data.items.map((n) => (
                  <li key={n.id} className={`flex items-start gap-4 px-5 py-4 ${n.read ? '' : 'bg-brand-50/50'}`}>
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? 'bg-slate-300' : 'bg-brand-600'}`} aria-label={n.read ? 'Read' : 'Unread'} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.read ? 'text-navy-600' : 'font-semibold text-navy-900'}`}>{n.message}</p>
                      <p className="mt-1 text-xs text-navy-500">{formatDateTime(n.createdAt)}</p>
                    </div>
                    {!n.read && <button type="button" className="btn-ghost shrink-0 py-1.5 text-brand-600" onClick={() => markRead(n)}>Mark as read</button>}
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={Math.max(1, Math.ceil(data.total / data.limit))} total={data.total} limit={data.limit} onChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
