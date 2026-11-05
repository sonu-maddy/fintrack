import { Bar, BarChart, Cell, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { CATEGORY_COLORS } from '../utils/constants';
import { formatINR, formatINRCompact, monthLabel } from '../utils/format';

const axisProps = { tick: { fill: '#64748b', fontSize: 12 }, axisLine: false, tickLine: false };
const compact = (v) => (v >= 100000 ? `${(v / 100000).toFixed(v % 100000 ? 1 : 0)}L` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgba(15,23,42,.18)', fontSize: 13 };

export function IncomeExpenseChart({ income, expense }) {
  const data = [
    { name: 'Income', value: income, color: '#059669' },
    { name: 'Expenses', value: expense, color: '#e11d48' },
  ];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barSize={56}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={compact} />
        <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: '#f1f5f9' }} contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ data }) {
  const rows = data.map((d) => ({ name: d.category, value: d.total, percentage: d.percentage }));
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[220px] w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {rows.map((r) => (
                <Cell key={r.name} fill={CATEGORY_COLORS[r.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatINR(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2.5 sm:w-1/2">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-navy-800">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[r.name] || '#94a3b8' }} />
              {r.name}
            </span>
            <span className="text-navy-600">
              {formatINRCompact(r.value)} <span className="text-navy-400">({r.percentage}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({ months }) {
  const data = months.map((m) => ({ ...m, label: monthLabel(m.month, { month: 'short' }) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={compact} />
        <Tooltip formatter={(v) => formatINR(v)} contentStyle={tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#059669" strokeWidth={2.5} fill="url(#gIncome)" />
        <Area type="monotone" dataKey="expense" name="Expenses" stroke="#e11d48" strokeWidth={2.5} fill="url(#gExpense)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
