import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  BookOpen,
  Clock,
  TrendingUp,
  BellRing,
  Award,
  GraduationCap,
  LayoutDashboard
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`http://localhost:5000/api/student/dashboard?studentId=${user.id}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
    </div>
  );

  const profile = data?.profile || {};
  const academics = data?.academics || { overallAttendance: 0, subjectStats: [] };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {profile.name || user?.user_metadata?.full_name}!</h1>
          <p className="text-slate-500 font-medium">Your academic performance overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Calendar size={16} className="text-primary-600" />
          <div className="text-sm font-bold text-slate-700">
            {profile.semester ? `Semester ${profile.semester}` : 'Current Session'}
            <span className="text-slate-300 mx-2">|</span>
            <span className="text-slate-500 font-normal">{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <LayoutDashboard size={18} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timetable'
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Calendar size={18} />
          Timetable
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Attendance Card */}
            <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white shadow-xl shadow-primary-200 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="text-primary-100 text-xs font-bold uppercase tracking-widest">Attendance</div>
                <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline relative z-10">
                <span className="text-4xl font-black tracking-tight">{academics.overallAttendance}%</span>
                <span className="ml-2 text-xs font-bold text-primary-200 uppercase tracking-wide">Aggregate</span>
              </div>
              <div className="mt-4 h-1 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/90 rounded-full transition-all duration-1000" style={{ width: `${academics.overallAttendance}%` }} />
              </div>
            </div>

            {/* Department Card */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:border-primary-200 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Department</div>
              <div className="mt-1 text-lg font-bold text-slate-900 leading-tight line-clamp-2">{profile.department || 'Not Assigned'}</div>
              <div className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded uppercase tracking-tight">B.Tech</div>
            </div>

            {/* Semester Card */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:border-primary-200 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <GraduationCap size={20} />
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semester</div>
              <div className="mt-1 text-2xl font-black text-slate-900">S{profile.semester || '?'}</div>
              <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{profile.batch || 'Batch N/A'}</div>
            </div>

            {/* Tutor Card */}
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:border-primary-200 transition-colors group">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class Tutor</div>
              <div className="mt-1 text-lg font-bold text-slate-900 truncate" title={profile.tutor}>{profile.tutor}</div>
              <div className="mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded uppercase tracking-tight">Faculty Advisor</div>
            </div>
          </div>


          {/* Notifications Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <BellRing size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
            </div>

            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-100 rounded-xl">
              <div className="h-12 w-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                <BellRing size={24} />
              </div>
              <p className="text-slate-500 font-medium">No new notifications</p>
              <p className="text-slate-400 text-sm mt-1">You're all caught up!</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Weekly Timetable</h2>
            <TimetableGrid timetable={data?.timetable || []} />
          </div>
        </div>
      )}
    </div>
  );
}

function TimetableGrid({ timetable }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    { id: 1, time: '09:10 - 10:10' },
    { id: 2, time: '10:10 - 11:10' },
    { id: 'break1', label: 'Break' },
    { id: 3, time: '11:20 - 12:20' },
    { id: 'lunch', label: 'Lunch' },
    { id: 4, time: '13:00 - 14:00' },
    { id: 5, time: '14:00 - 15:00' },
    { id: 'break2', label: 'Break' },
    { id: 6, time: '15:10 - 16:00' }
  ];

  const getSlot = (dayIdx, periodId) => {
    return timetable.find(t => t.day_of_week === dayIdx && t.period === periodId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase font-semibold">
            <th className="px-4 py-3 text-left border-b border-r border-slate-100 min-w-[100px]">Day</th>
            {periods.map((p, idx) => (
              <th key={idx} className="px-2 py-3 text-center border-b border-slate-100 min-w-[100px]">
                <div className="font-bold text-slate-700">{p.label || `Period ${idx + 1}`}</div>
                {p.time && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.time}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {days.map((day, dayIdx) => (
            <tr key={day} className="hover:bg-slate-50/50">
              <td className="px-4 py-4 font-bold text-slate-900 bg-slate-50/30 border-r border-slate-100">{day}</td>
              {periods.map((p, pIdx) => {
                if (p.label) return <td key={pIdx} className="bg-slate-50/50 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest writing-vertical-lr">{p.label}</td>;
                const slot = getSlot(dayIdx, p.id);
                return (
                  <td key={pIdx} className="p-2 border-r border-slate-50 text-center">
                    {slot ? (
                      <div className="bg-primary-50 text-primary-900 p-2 rounded-lg border border-primary-100">
                        <div className="font-bold truncate" title={slot.subject?.name}>{slot.subject?.code}</div>
                        <div className="text-[10px] text-primary-600 truncate mt-1">{slot.staff?.full_name}</div>
                      </div>
                    ) : (
                      <div className="text-slate-300">-</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}