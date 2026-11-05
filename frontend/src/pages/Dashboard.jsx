import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { transactionApi } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { currentMonth, formatINR, greeting, monthLabel, shiftMonth } from '../utils/format';
import StatCard from '../components/StatCard';
import TransactionRow from '../components/TransactionRow';
import { CategoryPie, IncomeExpenseChart, TrendChart } from '../components/Charts';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80 lg:col-span-3" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [state, setState] = useState({ loading: true, error: '', summary: null, trend: [], recent: [] });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const [summary, trend, recent] = await Promise.all([
        transactionApi.summary(month),
        transactionApi.trend(month, 6),
        transactionApi.list({ month, limit: 5 }),
      ]);
      if (id === requestId.current) setState({ loading: false, error: '', summary, trend: trend.months, recent: recent.items });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const { loading, error, summary, trend, recent } = state;
  const empty = summary && summary.transactionCount === 0;
  const isCurrent = month === currentMonth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-navy-500">Here is how {isCurrent ? 'this month is going' : `${monthLabel(month)} went`}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary p-2.5" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="sr-only" htmlFor="month">Month</label>
          <input id="month" type="month" value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="input w-44 text-center font-semibold" />
          <button type="button" className="btn-secondary p-2.5" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && !summary && <DashboardSkeleton />}
      {error && <ErrorState message={error} onRetry={load} />}

      {summary && !error && (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-navy-900 p-6 text-white shadow-card md:col-span-1">
              <p className="text-sm font-semibold text-navy-400">Balance for {monthLabel(month, { month: 'long' })}</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight">{formatINR(summary.balance)}</p>
              <p className="mt-2 text-sm text-navy-400">{summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} this month</p>
            </div>
            <StatCard label="Total income" value={summary.totalIncome} tone="income" icon={ArrowDownLeft} />
            <StatCard label="Total expenses" value={summary.totalExpense} tone="expense" icon={ArrowUpRight} />
          </div>

          {empty ? (
            <div className="card">
              <EmptyState
                icon={Receipt}
                title={`No transactions in ${monthLabel(month)}`}
                text="Add your first income or expense and the charts will fill in."
                action={<Link to="/transactions/new" className="btn-primary"><Plus className="h-4 w-4" /> Add transaction</Link>}
              />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <section className="card p-5 lg:col-span-2" aria-label="Income versus expenses">
                <h2 className="text-base font-bold text-navy-900">Income vs expenses</h2>
                <div className="mt-4"><IncomeExpenseChart income={summary.totalIncome} expense={summary.totalExpense} /></div>
              </section>
              <section className="card p-5 lg:col-span-3" aria-label="Expenses by category">
                <h2 className="text-base font-bold text-navy-900">Where the money went</h2>
                {summary.byCategory.length === 0 ? (
                  <p className="mt-6 text-sm text-navy-500">No expenses recorded this month.</p>
                ) : (
                  <div className="mt-4"><CategoryPie data={summary.byCategory} /></div>
                )}
              </section>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5" aria-label="Monthly trends">
              <h2 className="text-base font-bold text-navy-900">Last 6 months</h2>
              <div className="mt-4"><TrendChart months={trend} /></div>
            </section>
            <section className="card" aria-label="Recent transactions">
              <div className="flex items-center justify-between px-5 pb-1 pt-5">
                <h2 className="text-base font-bold text-navy-900">Recent transactions</h2>
                <Link to="/transactions" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all</Link>
              </div>
              {recent.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-navy-500">Nothing here yet for {monthLabel(month)}.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
