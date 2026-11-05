import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatINR } from '../utils/format';

export default function TransactionRow({ tx, onDelete }) {
  const income = tx.type === 'income';
  return (
    <li className="flex items-center gap-3 px-4 py-3.5 sm:gap-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${income ? 'bg-income-soft text-income' : 'bg-expense-soft text-expense'}`}>
        {income ? <ArrowDownLeft className="h-5 w-5" aria-hidden="true" /> : <ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-navy-900">{tx.category}</p>
        <p className="truncate text-xs text-navy-500">
          {formatDate(tx.date)}
          {tx.note ? ` - ${tx.note}` : ''}
        </p>
      </div>
      <p className={`shrink-0 text-sm font-extrabold ${income ? 'text-income' : 'text-expense'}`}>
        {income ? '+' : '-'}
        {formatINR(tx.amount)}
      </p>
      {onDelete && (
        <div className="flex shrink-0 gap-1">
          <Link to={`/transactions/${tx.id}/edit`} className="btn-ghost p-2" aria-label={`Edit ${tx.category} transaction`}>
            <Pencil className="h-4 w-4" />
          </Link>
          <button type="button" className="btn-ghost p-2 hover:text-expense" onClick={() => onDelete(tx)} aria-label={`Delete ${tx.category} transaction`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}
