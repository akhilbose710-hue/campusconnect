import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Users } from 'lucide-react';

export default function ClassSchedules() {
    const { user } = useAuth();
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) fetchTimetable();
    }, [user]);

    const fetchTimetable = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/student/timetable?studentId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setTimetable(data.timetable || []);
            }
        } catch (error) {
            console.error("Failed to load timetable", error);
        } finally {
            setLoading(false);
        }
    };

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const PERIODS = [
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

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-600" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
                    <CalendarDays size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Timetable</h1>
                    <p className="text-slate-500 font-medium">Detailed schedule for the current semester</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28 border-r border-slate-100">Day</th>
                                {PERIODS.map((p, idx) => (
                                    <th key={idx} className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center border-r border-slate-100 last:border-r-0 min-w-[120px]">
                                        <div className="font-bold text-slate-700">{p.label || `Period ${p.id}`}</div>
                                        {p.time && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.time}</div>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {DAYS.map((day, dIdx) => (
                                <tr key={day} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5 font-bold text-slate-600 text-[11px] uppercase tracking-wider border-r border-slate-100 bg-slate-50/20">{day}</td>
                                    {PERIODS.map((p, pIdx) => {
                                        if (p.label) return <td key={pIdx} className="bg-slate-50/50 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest writing-vertical-lr select-none">{p.label}</td>;

                                        const slot = getSlot(dIdx, p.id);
                                        return (
                                            <td key={pIdx} className="p-3 border-r border-slate-100 last:border-r-0 h-32 min-w-[160px]">
                                                {slot ? (
                                                    <div className="w-full h-full p-4 rounded-2xl bg-white text-left border border-slate-200 hover:border-primary-400 hover:shadow-xl hover:shadow-primary-100 hover:scale-[1.03] transition-all relative overflow-hidden ring-0 hover:ring-2 hover:ring-primary-100 group/slot">
                                                        <div className="text-[9px] font-black text-primary-600 uppercase tracking-tighter mb-1.5 flex items-center gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                                                            {slot.subject?.code}
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-3">{slot.subject?.name}</div>
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-tight mt-auto">
                                                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg text-slate-600 group-hover/slot:bg-primary-50 group-hover/slot:text-primary-700 transition-colors">
                                                                <Users size={12} />
                                                                {slot.staff?.full_name || 'TBA'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Free</span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}