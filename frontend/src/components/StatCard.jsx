import { formatINR } from '../utils/format';

const TONES = {
  income: { chip: 'bg-income-soft text-income', value: 'text-navy-900' },
  expense: { chip: 'bg-expense-soft text-expense', value: 'text-navy-900' },
};

export default function StatCard({ label, value, tone = 'income', icon: Icon, hint }) {
  const t = TONES[tone];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-500">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.chip}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={`mt-3 text-2xl font-extrabold tracking-tight ${t.value}`}>{formatINR(value)}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </div>
  );
}
