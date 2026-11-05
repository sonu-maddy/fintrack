import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LayoutDashboard, LogOut, Plus, Receipt, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-navy-600 hover:bg-slate-100 hover:text-navy-900'
  }`;

const tabClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-navy-500'}`;

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-navy-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <TrendingUp className="h-5 w-5" aria-hidden="true" />
      </span>
      FinTrack
    </span>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      toast.success('Logged out');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="px-2 py-3"><Logo /></div>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-5 w-5" aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="truncate text-sm font-bold text-navy-900">{user?.name}</p>
          <p className="truncate text-xs text-navy-500">{user?.email}</p>
          <button type="button" onClick={onLogout} className="btn-secondary mt-3 w-full py-2">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="md:hidden"><Logo /></div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <NavLink to="/transactions/new" className="btn-primary py-2.5">
              <Plus className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Add transaction</span><span className="sm:hidden">Add</span>
            </NavLink>
            <NotificationBell />
            <button type="button" onClick={onLogout} className="btn-secondary h-10 w-10 p-0 md:hidden" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            <Icon className="h-5 w-5" aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
