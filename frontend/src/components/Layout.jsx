import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();

  const primaryRole = roles[0];

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/reports', label: 'Reports' }
  ];

  if (roles.includes('SUPER_ADMIN') || roles.includes('IT_ADMIN')) {
    navItems.push({ to: '/admin', label: 'Admin' });
    navItems.push({ to: '/devices', label: 'Devices' });
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white/80 px-4 py-6 md:block">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600" />
          <div>
            <div className="text-sm font-semibold text-slate-900">Campus Connect</div>
            <div className="text-xs text-slate-500">{primaryRole || 'User'}</div>
          </div>
        </div>
        <nav className="space-y-1 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                classNames(
                  'flex items-center rounded-md px-3 py-2 font-medium',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 md:hidden">
            <div className="h-7 w-7 rounded-lg bg-primary-600" />
            <span className="text-sm font-semibold text-slate-900">Campus Connect</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="text-right text-xs">
              <div className="font-semibold text-slate-900">{user?.user_metadata?.full_name || user?.name || user?.email}</div>
              <div className="text-slate-500">{primaryRole}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
        <footer className="border-t border-slate-200 bg-white/60 px-4 py-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Campus Connect</span>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-slate-700">
            Privacy
          </Link>
        </footer>
      </div>
    </div>
  );
}

