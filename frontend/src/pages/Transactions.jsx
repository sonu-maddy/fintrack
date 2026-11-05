import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionApi } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { ALL_CATEGORIES } from '../utils/constants';
import TransactionRow from '../components/TransactionRow';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const LIMIT = 10;
const INITIAL = { month: '', type: '', category: '', q: '', sort: '-date', page: 1 };

export default function Transactions() {
  const [filters, setFilters] = useState(INITIAL);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  // Debounce the search box so we do not call the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim(), page: 1 })), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    const params = { limit: LIMIT, page: filters.page, sort: filters.sort };
    ['month', 'type', 'category', 'q'].forEach((k) => filters[k] && (params[k] = filters[k]));
    try {
      const result = await transactionApi.list(params);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const update = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const hasFilters = Boolean(filters.month || filters.type || filters.category || filters.q);
  const reset = () => { setSearch(''); setFilters(INITIAL); };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await transactionApi.remove(toDelete.id);
      toast.success('Transaction deleted');
      setToDelete(null);
      // If that was the last item on the page, step back one page.
      if (data.items.length === 1 && filters.page > 1) setFilters((f) => ({ ...f, page: f.page - 1 }));
      else load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-navy-500">Search, filter and manage everything you have recorded.</p>
        </div>
        <Link to="/transactions/new" className="btn-primary hidden sm:inline-flex"><Plus className="h-4 w-4" /> Add transaction</Link>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <label htmlFor="search" className="sr-only">Search notes</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden="true" />
            <input id="search" className="input pl-10" placeholder="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f-month" className="sr-only">Month</label>
            <input id="f-month" type="month" className="input" value={filters.month} onChange={(e) => update({ month: e.target.value })} />
          </div>
          <div>
            <label htmlFor="f-type" className="sr-only">Type</label>
            <select id="f-type" className="input" value={filters.type} onChange={(e) => update({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-category" className="sr-only">Category</label>
            <select id="f-category" className="input" value={filters.category} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-navy-600">
            <label htmlFor="f-sort" className="font-semibold">Sort by</label>
            <select id="f-sort" className="input w-auto py-1.5" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="-date">Newest first</option>
              <option value="date">Oldest first</option>
              <option value="-amount">Highest amount</option>
              <option value="amount">Lowest amount</option>
            </select>
          </div>
          {hasFilters && (
            <button type="button" className="btn-ghost py-1.5 text-brand-600" onClick={reset}><X className="h-4 w-4" /> Clear filters</button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card overflow-hidden">
          {loading && !data ? (
            <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={hasFilters ? 'No transactions match these filters' : 'No transactions yet'}
              text={hasFilters ? 'Try a different month, category or search term.' : 'Record your first income or expense to start tracking.'}
              action={hasFilters ? <button type="button" className="btn-secondary" onClick={reset}>Clear filters</button> : <Link to="/transactions/new" className="btn-primary"><Plus className="h-4 w-4" /> Add transaction</Link>}
            />
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <ul className="divide-y divide-slate-100">
                {data.items.map((tx) => <TransactionRow key={tx.id} tx={tx} onDelete={setToDelete} />)}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this transaction?"
        message={toDelete ? `${toDelete.category} on ${toDelete.date} will be removed permanently.` : ''}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
