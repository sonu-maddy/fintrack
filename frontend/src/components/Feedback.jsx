import { AlertTriangle, Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-navy-500" role="status">
      <Spinner className="h-6 w-6 text-brand-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-navy-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-expense-soft text-expense">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-navy-900">Could not load this page</h3>
      <p className="mt-1 max-w-md text-sm text-navy-500">{message}</p>
      {onRetry && (
        <button type="button" className="btn-primary mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
