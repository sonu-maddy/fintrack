import { ShieldCheck, BellRing, PieChart } from 'lucide-react';
import { Logo } from '../layouts/AppLayout';

const POINTS = [
  { icon: PieChart, title: 'See the month at a glance', text: 'Income, expenses and balance with a category breakdown.' },
  { icon: BellRing, title: 'Get warned about big spends', text: 'Set a limit and get an alert when one expense crosses it.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Every account is isolated and sessions rotate automatically.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <span className="flex items-center gap-2.5 text-lg font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
            <PieChart className="h-5 w-5" aria-hidden="true" />
          </span>
          FinTrack
        </span>
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Know where your money goes, before the month ends.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-5 w-5 text-brand-200" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="block text-sm text-navy-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-navy-400">Personal finance tracker</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{title}</h1>
          <p className="mt-2 text-navy-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-navy-600">{footer}</p>
        </div>
      </main>
    </div>
  );
}
