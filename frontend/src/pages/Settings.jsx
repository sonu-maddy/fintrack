import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/endpoints';
import { errorMessage } from '../services/api';
import { formatINR } from '../utils/format';
import { ErrorState, PageLoader, Spinner } from '../components/Feedback';

const schema = z.object({
  threshold: z
    .number({ invalid_type_error: 'Enter an amount' })
    .positive('Limit must be greater than 0')
    .max(1_000_000_000, 'Limit is too large')
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most 2 decimal places'),
});

export default function Settings() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { threshold: undefined } });

  const load = async () => {
    setLoadError('');
    try {
      const data = await notificationApi.getThreshold();
      setCurrent(data);
      reset({ threshold: data.threshold });
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onSubmit = async ({ threshold }) => {
    try {
      const data = await notificationApi.setThreshold(threshold);
      setCurrent(data);
      reset({ threshold: data.threshold });
      toast.success(`Alert limit set to ${formatINR(data.threshold)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!current) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-navy-500">Manage your alerts and account.</p>
      </div>

      <section className="card p-6 sm:p-8" aria-labelledby="threshold-title">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><BellRing className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 id="threshold-title" className="text-lg font-bold text-navy-900">Expense alert limit</h2>
            <p className="mt-1 text-sm text-navy-600">
              You get a notification when a single expense is higher than this amount.
              {current.isDefault && ' This is the default limit until you change it.'}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6">
          <label htmlFor="threshold" className="label">Limit per expense (INR)</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-navy-500">{'\u20B9'}</span>
              <input id="threshold" type="number" inputMode="decimal" step="0.01" min="0" className={`input pl-8 ${errors.threshold ? 'input-error' : ''}`} {...register('threshold', { valueAsNumber: true })} />
            </div>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Spinner className="h-4 w-4" />} Save limit
            </button>
          </div>
          {errors.threshold && <p className="field-error">{errors.threshold.message}</p>}
        </form>
      </section>

      <section className="card p-6 sm:p-8" aria-labelledby="account-title">
        <h2 id="account-title" className="text-lg font-bold text-navy-900">Account</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-navy-500">Name</dt><dd className="mt-0.5 font-bold text-navy-900">{user?.name}</dd></div>
          <div><dt className="font-semibold text-navy-500">Email</dt><dd className="mt-0.5 break-all font-bold text-navy-900">{user?.email}</dd></div>
        </dl>
      </section>
    </div>
  );
}
