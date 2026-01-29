import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarCheck,
  BarChart3,
  Shield,
  Monitor,
  BookOpen,
  CalendarDays,
  FileClock,
  FileText,
  ClipboardList,
  LogOut,
  GraduationCap,
  Briefcase,
  Building2,
  Users,
  ChevronRight,
  Clock,
  UserCheck,
  FileEdit,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout() {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0];
  const location = useLocation();
  const [todaySchedule, setTodaySchedule] = useState([]);

  const facultyRoles = ['STAFF', 'LECTURER', 'HOD', 'PRINCIPAL'];
  const isFaculty = roles.some(r => facultyRoles.includes(r));

  useEffect(() => {
    if (isFaculty && user?.id) {
      fetchTodaySchedule();
    }
  }, [user, isFaculty]);

  const fetchTodaySchedule = async () => {
    try {
      const dayIdx = (new Date().getDay() + 6) % 7;
      if (dayIdx > 4) return;

      const res = await fetch(`http://localhost:5000/api/admin/staff-dashboard-data?staffId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.timetable || [])
          .filter(t => t.day_of_week === dayIdx)
          .sort((a, b) => a.period - b.period);
        setTodaySchedule(filtered);
      }
    } catch (err) {
      console.error("Sidebar schedule load failed:", err);
    }
  };

  const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('IT_ADMIN');

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/reports', label: 'Reports', icon: BarChart3 }
  ].filter(item => {
    if (isFaculty && (item.label === 'Dashboard' || item.label === 'Attendance')) return false;
    if (isAdmin && (item.label === 'Dashboard' || item.label === 'Attendance')) return false;
    return true;
  });

  if (isAdmin) {
    navItems.push({ to: '/admin?tab=overview', label: 'Overview', icon: LayoutDashboard });
    navItems.push({ to: '/admin?tab=users', label: 'All Users', icon: Users });
    navItems.push({ to: '/admin?tab=departments', label: 'Departments', icon: Building2 });
    navItems.push({ to: '/admin?tab=manage-roles', label: 'Manage Roles', icon: Shield });
    navItems.push({ to: '/admin?tab=add-student', label: 'Add Student', icon: GraduationCap });
    navItems.push({ to: '/admin?tab=add-course', label: 'Add Course', icon: BookOpen });
    navItems.push({ to: '/admin?tab=timetable', label: 'Timetable', icon: CalendarDays });
    navItems.push({ to: '/admin?tab=add-staff', label: 'Add Staff', icon: Briefcase });
    navItems.push({ to: '/admin?tab=promote', label: 'Promote Students', icon: GraduationCap });
    navItems.push({ to: '/devices', label: 'Devices', icon: Monitor });
  }

  if (isFaculty) {
    navItems.unshift({ to: '/dashboard', label: 'My Schedule', icon: Clock });
    navItems.push({ to: '/mark-attendance', label: 'Mark Attendance', icon: UserCheck });
    navItems.push({ to: '/leave', label: 'Leave & Apps', icon: FileEdit });
    navItems.push({ to: '/forms', label: 'My Forms', icon: FileText });
    if (roles.includes('HOD') || roles.includes('PRINCIPAL')) {
      navItems.push({ to: '/attendance', label: 'Dept Stats', icon: TrendingUp });
    }
  }

  if (roles.includes('STUDENT')) {
    navItems.push({ to: '/my-courses', label: 'My Courses', icon: BookOpen });
    navItems.push({ to: '/schedule', label: 'My Timetable', icon: CalendarDays });
    // navItems.push({ to: '/attendance', label: 'Attendance', icon: CalendarCheck }); // Removed duplicate
    navItems.push({ to: '/leave', label: 'Leave Applications', icon: FileClock });
    navItems.push({ to: '/forms', label: 'Forms & Certs', icon: FileText });
    navItems.push({ to: '/survey', label: 'Activity Survey', icon: ClipboardList });
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
    <div className="flex min-h-screen bg-slate-50/50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-200 text-white">
              <Shield size={24} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 leading-none">Campus Connect</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{primaryRole || 'User'}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="pb-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-4">Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname + location.search === item.to ||
                (item.to === '/admin?tab=overview' && location.pathname === '/admin' && !location.search);
              return (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={classNames(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <item.icon size={18} className={`transition-colors duration-200 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Schedule Widget for Faculty */}
          {isFaculty && todaySchedule.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-4 flex items-center justify-between">
                <span>Today's Hours</span>
                <Clock size={12} className="text-primary-400" />
              </div>
              <div className="space-y-1">
                {todaySchedule.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => navigate(`/mark-attendance?classId=${slot.class_id}&period=${slot.period}&subjectId=${slot.subject_id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
                  >
                    <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      P{slot.period}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-700 truncate group-hover:text-slate-900">{slot.subject?.name}</div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase group-hover:text-slate-600 tracking-tight">
                        <span>{slot.class?.name}</span>
                        {slot.class?.semester && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>S{slot.class.semester}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95">
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-200">
              <Shield size={20} />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">Campus Connect</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-5">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 leading-none">{user?.user_metadata?.full_name || user?.name || user?.email}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{primaryRole}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-inner">
              {(user?.user_metadata?.full_name || user?.name || user?.email)?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white/60 px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <span>© {new Date().getFullYear()} Campus Connect</span>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-primary-600 transition-colors">Privacy</Link>
              <Link to="/support" className="hover:text-primary-600 transition-colors">Support</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}