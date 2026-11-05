import { useEffect } from 'react';
import { Spinner } from './Feedback';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-4 sm:items-center" onClick={() => !busy && onCancel()}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-lg font-bold text-navy-900">{title}</h2>
        <p className="mt-2 text-sm text-navy-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
