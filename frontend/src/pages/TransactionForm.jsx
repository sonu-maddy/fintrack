import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { transactionApi } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/constants';
import { todayISO } from '../utils/format';
import { ErrorState, PageLoader, Spinner } from '../components/Feedback';
import { notifyNotificationsChanged } from '../hooks/useNotifications';

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: z
      .number({ invalid_type_error: 'Enter an amount' })
      .positive('Amount must be greater than 0')
      .max(1_000_000_000, 'Amount is too large')
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most 2 decimal places'),
    category: z.string().min(1, 'Choose a category'),
    date: z.string().min(1, 'Choose a date'),
    note: z.string().max(200, 'Keep the note under 200 characters').optional(),
  })
  .superRefine((v, ctx) => {
    const allowed = v.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (v.category && !allowed.includes(v.category)) ctx.addIssue({ code: 'custom', path: ['category'], message: 'Choose a category for this type' });
  });

export default function TransactionForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', amount: undefined, category: '', date: todayISO(), note: '' },
  });

  const type = watch('type');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    (async () => {
      try {
        const { transaction: tx } = await transactionApi.get(id);
        if (active) reset({ type: tx.type, amount: tx.amount, category: tx.category, date: tx.date, note: tx.note || '' });
      } catch (err) {
        if (active) setLoadError(errorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editing, id, reset]);

  const onSubmit = async (values) => {
    setFormError('');
    const body = { ...values, note: values.note || '' };
    try {
      if (editing) await transactionApi.update(id, body);
      else await transactionApi.create(body);
      toast.success(editing ? 'Transaction updated' : 'Transaction added');
      // A big expense may create an alert in the background; refresh the bell shortly after.
      if (values.type === 'expense') setTimeout(notifyNotificationsChanged, 1500);
      navigate('/transactions');
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const pickType = (next) => {
    if (next === type) return;
    setValue('type', next);
    setValue('category', '');
  };

  if (loading) return <PageLoader />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => navigate(0)} />;

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/transactions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to transactions
      </Link>
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{editing ? 'Edit transaction' : 'Add transaction'}</h1>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
          {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-expense-soft px-4 py-3 text-sm font-semibold text-expense">{formError}</div>}

          <fieldset>
            <legend className="label">Type</legend>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {['expense', 'income'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pickType(t)}
                  aria-pressed={type === t}
                  className={`rounded-lg py-2 text-sm font-bold capitalize transition-colors ${type === t ? (t === 'income' ? 'bg-income text-white shadow-sm' : 'bg-expense text-white shadow-sm') : 'text-navy-600 hover:text-navy-900'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="amount" className="label">Amount (INR)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-navy-500">{'\u20B9'}</span>
              <input id="amount" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" className={`input pl-8 ${errors.amount ? 'input-error' : ''}`} {...register('amount', { valueAsNumber: true })} />
            </div>
            {errors.amount && <p className="field-error">{errors.amount.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="label">Category</label>
              <select id="category" className={`input ${errors.category ? 'input-error' : ''}`} {...register('category')}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="field-error">{errors.category.message}</p>}
            </div>
            <div>
              <label htmlFor="date" className="label">Date</label>
              <input id="date" type="date" className={`input ${errors.date ? 'input-error' : ''}`} {...register('date')} />
              {errors.date && <p className="field-error">{errors.date.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="note" className="label">Note <span className="font-normal text-navy-400">(optional)</span></label>
            <textarea id="note" rows={3} maxLength={200} className={`input resize-none ${errors.note ? 'input-error' : ''}`} placeholder="What was this for?" {...register('note')} />
            {errors.note && <p className="field-error">{errors.note.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link to="/transactions" className="btn-secondary">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="h-4 w-4" />}
              {editing ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
