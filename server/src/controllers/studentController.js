const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Initialize Supabase Admin Client
let supabaseAdmin;
if (config.supabase.serviceKey) {
    supabaseAdmin = createClient(
        config.supabase.url,
        config.supabase.serviceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

exports.getDashboardData = async (req, res, next) => {
    try {
        const { studentId } = req.query;
        if (!studentId) return res.status(400).json({ error: 'Student ID is required' });

        // 1. Fetch Student Details with Class, Tutor, and User Name
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('*, users(full_name), class:classes(*, tutor:users(full_name))')
            .eq('user_id', studentId)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ error: 'Student profile not found' });
        }

        // 2. Determine Semester
        const semester = student.semester || student.class?.semester;

        // 3. Fetch Attendance Records
        const { data: attendance } = await supabaseAdmin
            .from('attendance')
            .select('*')
            .eq('student_id', student.id);

        // 4. Fetch Subjects for the Semester
        const { data: subjects } = await supabaseAdmin
            .from('subjects')
            .select('*')
            .eq('department', student.department)
            .eq('semester', semester);

        // 5. Fetch Timetable for Faculty Mapping & Display
        let timetable = [];
        if (student.class_id) {
            const { data: ttData } = await supabaseAdmin
                .from('timetables')
                .select('*, subject:subjects(name, code), staff:users(full_name)')
                .eq('class_id', student.class_id);
            timetable = ttData || [];
        }

        // 6. Calculate Attendance Stats & Map Faculty
        let totalClasses = 0;
        let presentClasses = 0;
        const subjectStats = (subjects || []).map(sub => {
            const subAttendance = (attendance || []).filter(a => a.subject_id === sub.id);
            const subTotal = subAttendance.length;
            const subPresent = subAttendance.filter(a => a.status === 'PRESENT').length;

            totalClasses += subTotal;
            presentClasses += subPresent;

            // Find faculty from timetable for this subject
            const facultyEntry = timetable.find(t => t.subject_id === sub.id);
            const facultyName = facultyEntry?.staff?.full_name || 'Not Assigned';

            return {
                ...sub,
                total: subTotal,
                present: subPresent,
                percentage: subTotal > 0 ? Math.round((subPresent / subTotal) * 100) : 0,
                faculty: facultyName
            };
        });

        const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

        res.json({
            profile: {
                name: student.users?.full_name || 'Student',
                admission: student.admission_number,
                department: student.department,
                semester: semester,
                batch: student.class?.batch,
                tutor: student.class?.tutor?.full_name || 'Not Assigned',
                class_name: student.class?.name
            },
            academics: {
                overallAttendance: overallPercentage,
                subjectStats: subjectStats
            },
            timetable: timetable // Return timetable directly for efficiency
        });

    } catch (error) {
        next(error);
    }
};

exports.getCourses = async (req, res, next) => {
    try {
        const { studentId } = req.query;
        // Fetch student to get dept and semester directly or via class
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('department, semester, class_id, class:classes(semester)')
            .eq('user_id', studentId)
            .single();

        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Prefer explicit semester in student table if present, else fallback to class semester
        const semester = student.semester || student.class?.semester;

        const { data: courses, error } = await supabaseAdmin
            .from('subjects')
            .select('*')
            .eq('department', student.department)
            .eq('semester', semester);

        if (error) throw error;
        res.json({ courses });
    } catch (error) {
        next(error);
    }
};

exports.getTimetable = async (req, res, next) => {
    try {
        const { studentId } = req.query;
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('class_id')
            .eq('user_id', studentId)
            .single();

        if (!student?.class_id) return res.json({ timetable: [] });

        const { data: timetable, error } = await supabaseAdmin
            .from('timetables')
            .select('*, subject:subjects(name, code), staff:users(full_name)')
            .eq('class_id', student.class_id);

        if (error) throw error;
        res.json({ timetable });
    } catch (error) {
        next(error);
    }
};
