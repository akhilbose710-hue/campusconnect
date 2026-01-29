const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

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
} else {
    console.warn('WARNING: SUPABASE_SERVICE_KEY is not set. Admin features will be disabled.');
}

const ensureAdmin = (res) => {
    if (!supabaseAdmin) {
        res.status(503).json({ error: 'Admin configuration missing (Service Key)' });
        return false;
    }
    return true;
};

exports.createUser = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { email, name, role, metadata } = req.body;
        let { password } = req.body;
        if (!email || !role) {
            return res.status(400).json({ error: 'Email and role are required' });
        }
        if (!password && metadata?.dob && metadata.dob.includes('-')) {
            const [y, m, d] = metadata.dob.split('-');
            password = `${d}${m}${y}`;
        }
        if (!password) password = 'Campus@123';
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name, role, ...metadata },
            app_metadata: { roles: [role] }
        });
        if (authError) throw authError;
        if (authData.user.user_metadata.department && authData.user.user_metadata.departmentCode) {
            delete authData.user.user_metadata.department;
            await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
                user_metadata: authData.user.user_metadata
            });
        }
        const userId = authData.user.id;
        await supabaseAdmin.from('users').update({ roles: [role] }).eq('id', userId);
        if (role === 'STUDENT') {
            await supabaseAdmin.from('students').insert([{
                user_id: userId,
                admission_number: metadata.admissionNo || `ENR-${Date.now()}`,
                department: metadata.departmentCode,
                class_id: metadata.class_id,
                semester: metadata.semester
            }]);
        } else if (role !== 'SUPER_ADMIN') {
            await supabaseAdmin.from('staff').insert([{
                user_id: userId,
                staff_id: metadata.employeeId || `EMP-${Date.now()}`,
                department: metadata.departmentCode,
                designation: role
            }]);
        }
        res.status(201).json({ message: 'User created successfully', user: authData.user });
    } catch (error) {
        next(error);
    }
};

exports.bulkCreateUsers = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { users } = req.body;
        if (!Array.isArray(users)) {
            return res.status(400).json({ error: 'Users must be an array' });
        }
        const results = { success: 0, failed: 0, errors: [] };
        for (const user of users) {
            try {
                let password = user.password;
                if (!password && user.metadata?.dob && user.metadata.dob.includes('-')) {
                    const [y, m, d] = user.metadata.dob.split('-');
                    password = `${d}${m}${y}`;
                }
                const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
                    email: user.email,
                    password: password || 'Campus@123',
                    email_confirm: true,
                    user_metadata: { full_name: user.name, role: user.role, ...user.metadata },
                    app_metadata: { roles: [user.role] }
                });
                if (error) throw error;
                const userId = authData.user.id;
                await supabaseAdmin.from('users').update({ roles: [user.role] }).eq('id', userId);
                if (user.role === 'STUDENT') {
                    await supabaseAdmin.from('students').insert([{
                        user_id: userId,
                        admission_number: user.metadata?.admissionNo || `ENR-${Date.now()}`,
                        department: user.metadata?.departmentCode,
                        class_id: user.metadata?.class_id,
                        semester: user.metadata?.semester
                    }]);
                } else if (user.role !== 'SUPER_ADMIN') {
                    await supabaseAdmin.from('staff').insert([{
                        user_id: userId,
                        staff_id: user.metadata?.employeeId || `EMP-${Date.now()}`,
                        department: user.metadata?.departmentCode,
                        designation: user.role
                    }]);
                }
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ email: user.email, error: err.message });
            }
        }
        res.json({ message: 'Bulk processing complete', results });
    } catch (error) {
        next(error);
    }
};

exports.promoteStudents = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { data: classes, error: classError } = await supabaseAdmin.from('classes').select('*');
        if (classError) throw classError;
        await supabaseAdmin.from('timetables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        let promotedClasses = 0;
        let graduatedStudents = 0;
        for (const cls of classes) {
            const nameMatch = cls.name.match(/S(\d+)/i);
            if (nameMatch) {
                const currentSem = parseInt(nameMatch[1]);
                if (currentSem >= 8) {
                    const { data: students } = await supabaseAdmin.from('students').select('user_id').eq('class_id', cls.id);
                    if (students) {
                        for (const s of students) {
                            await supabaseAdmin.auth.admin.deleteUser(s.user_id);
                            graduatedStudents++;
                        }
                    }
                    await supabaseAdmin.from('classes').delete().eq('id', cls.id);
                } else {
                    const nextSem = currentSem + 1;
                    const updatedName = cls.name.replace(/S(\d+)/i, `S${nextSem}`);
                    await supabaseAdmin.from('classes').update({
                        name: updatedName,
                        semester: nextSem
                    }).eq('id', cls.id);
                    const { data: students } = await supabaseAdmin.from('students').select('user_id').eq('class_id', cls.id);
                    if (students) {
                        for (const s of students) {
                            const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
                            if (user) {
                                await supabaseAdmin.auth.admin.updateUserById(s.user_id, {
                                    user_metadata: { ...user.user_metadata, semester: `${nextSem}${getOrdinal(nextSem)} Semester` }
                                });
                            }
                        }
                    }
                    promotedClasses++;
                }
            }
        }
        res.json({ message: 'Promotion complete', promotedClasses, graduatedStudents });
    } catch (error) {
        next(error);
    }
};

exports.listSubjects = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { departmentCode } = req.query;
        let query = supabaseAdmin.from('subjects').select('*');
        if (departmentCode) query = query.eq('department', departmentCode);
        const { data, error } = await query.order('name');
        if (error) throw error;
        res.json({ subjects: data });
    } catch (error) {
        next(error);
    }
};

exports.createSubject = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { code, name, credits, department, semester } = req.body;
        const { data, error } = await supabaseAdmin.from('subjects').insert([{ code, name, credits, department, semester }]).select();
        if (error) throw error;
        res.status(201).json({ message: 'Subject created', subject: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.deleteSubject = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('subjects').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Subject deleted' });
    } catch (error) {
        next(error);
    }
};

exports.updateSubject = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { name, semester } = req.body;
        const { data, error } = await supabaseAdmin.from('subjects')
            .update({ name, semester })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: 'Subject updated', subject: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.getTimetable = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { classId } = req.query;
        const { data, error } = await supabaseAdmin.from('timetables').select('*, subject:subjects(name, code), staff:users(full_name)').eq('class_id', classId);
        if (error) throw error;
        res.json({ timetable: data });
    } catch (error) {
        next(error);
    }
};

exports.upsertTimetable = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { class_id, day_of_week, period, subject_id, staff_id } = req.body;
        const { data, error } = await supabaseAdmin.from('timetables').upsert({ class_id, day_of_week, period, subject_id, staff_id }, { onConflict: 'class_id,day_of_week,period' }).select();
        if (error) throw error;
        res.json({ message: 'Timetable updated', entry: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.resetTimetable = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { classId } = req.params;
        const { error } = await supabaseAdmin.from('timetables').delete().eq('class_id', classId);
        if (error) throw error;
        res.json({ message: 'Timetable reset successful' });
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        res.json({ totalUsers: users.length });
    } catch (error) {
        next(error);
    }
};

exports.listUsers = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const [{ data: { users }, error: authError }, { data: depts, error: deptError }, { data: students }, { data: staff }] = await Promise.all([
            supabaseAdmin.auth.admin.listUsers(),
            supabaseAdmin.from('departments').select('name, code'),
            supabaseAdmin.from('students').select('user_id, admission_number'),
            supabaseAdmin.from('staff').select('user_id, staff_id')
        ]);
        if (authError) throw authError;
        if (deptError) throw deptError;
        const deptMap = (depts || []).reduce((acc, d) => { acc[d.code] = d.name; return acc; }, {});
        const studentMap = (students || []).reduce((acc, s) => { acc[s.user_id] = s.admission_number; return acc; }, {});
        const staffMap = (staff || []).reduce((acc, s) => { acc[s.user_id] = s.staff_id; return acc; }, {});
        const formattedUsers = users.map(u => {
            const role = u.user_metadata?.role || u.app_metadata?.roles?.[0] || 'USER';
            const deptCode = u.user_metadata?.departmentCode;
            return {
                id: u.id,
                email: u.email,
                name: u.user_metadata?.full_name || 'N/A',
                role,
                dept: deptMap[deptCode] || deptCode || u.user_metadata?.department || 'N/A',
                status: u.last_sign_in_at ? 'Active' : 'Inactive',
                dob: u.user_metadata?.dob || 'N/A',
                officialId: role === 'STUDENT' ? studentMap[u.id] : (staffMap[u.id] || 'N/A')
            };
        });
        res.json({ users: formattedUsers });
    } catch (error) {
        next(error);
    }
};

exports.listStaff = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        const staff = users
            .filter(u => {
                const role = u.user_metadata?.role || u.app_metadata?.roles?.[0];
                return role && role !== 'STUDENT';
            })
            .map(u => ({
                id: u.id,
                name: u.user_metadata?.full_name || u.email,
                deptCode: u.user_metadata?.departmentCode
            }));
        res.json({ staff });
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.listDepartments = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { data, error } = await supabaseAdmin
            .from('departments')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        res.json({ departments: data });
    } catch (error) {
        next(error);
    }
};

exports.createDepartment = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { name, code } = req.body;
        if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' });
        const { data, error } = await supabaseAdmin
            .from('departments')
            .insert([{ name, code }])
            .select();
        if (error) throw error;
        res.status(201).json({ message: 'Department created', department: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.updateDepartment = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' });
        const { data, error } = await supabaseAdmin
            .from('departments')
            .update({ name, code })
            .eq('id', id)
            .select();
        if (error) throw error;
        res.json({ message: 'Department updated', department: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.deleteDepartment = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('departments')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ message: 'Department deleted' });
    } catch (error) {
        next(error);
    }
};

exports.listClasses = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { departmentCode } = req.query;
        let query = supabaseAdmin.from('classes').select('*, tutor:users(full_name)');
        if (departmentCode) query = query.eq('department_code', departmentCode);
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        res.json({ classes: data });
    } catch (error) {
        next(error);
    }
};

exports.createClass = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { name, department_code, tutor_id, semester, batch } = req.body;
        if (!name || !department_code) return res.status(400).json({ error: 'Name and Department are required' });
        const { data, error } = await supabaseAdmin
            .from('classes')
            .insert([{ name, department_code, tutor_id: tutor_id || null, semester, batch }])
            .select();
        if (error) throw error;
        res.status(201).json({ message: 'Class created', class: data[0] });
    } catch (error) {
        next(error);
    }
};

exports.getClassStudents = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('students')
            .select('user_id, admission_number, users(full_name, email)')
            .eq('class_id', id);
        if (error) throw error;
        const formatted = (data || []).map(s => ({
            id: s.user_id,
            admission_number: s.admission_number,
            name: s.users?.full_name || 'N/A',
            email: s.users?.email || 'N/A'
        }));
        res.json({ students: formatted });
    } catch (error) {
        next(error);
    }
};

exports.updateClass = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { name, tutor_id, semester, batch } = req.body;
        const { data, error } = await supabaseAdmin
            .from('classes')
            .update({ name, tutor_id: tutor_id || null, semester, batch })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json({ message: 'Class updated', class: data });
    } catch (error) {
        next(error);
    }
};

exports.removeStudentFromClass = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { studentId } = req.params;
        const { error } = await supabaseAdmin
            .from('students')
            .update({ class_id: null })
            .eq('user_id', studentId);
        if (error) throw error;
        res.json({ message: 'Student removed from class' });
    } catch (error) {
        next(error);
    }
};

exports.deleteClass = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin.from('classes').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: 'Class deleted' });
    } catch (error) {
        next(error);
    }
};

exports.assignRole = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { userId, role, departmentCode } = req.body;
        if (!userId || !role) {
            return res.status(400).json({ error: 'User ID and role are required' });
        }
        const { data: { users: allUsers }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (!listErr) {
            if (role === 'HOD' && departmentCode) {
                const currentHOD = allUsers.find(u =>
                    (u.user_metadata?.role === 'HOD' || u.app_metadata?.roles?.includes('HOD')) &&
                    u.user_metadata?.departmentCode === departmentCode &&
                    u.id !== userId
                );
                if (currentHOD) {
                    await supabaseAdmin.auth.admin.updateUserById(currentHOD.id, {
                        user_metadata: { ...currentHOD.user_metadata, role: 'STAFF' },
                        app_metadata: { roles: ['STAFF'] }
                    });
                    await supabaseAdmin.from('users').update({ roles: ['STAFF'] }).eq('id', currentHOD.id);
                }
            } else if (role === 'PRINCIPAL') {
                const currentPrincipal = allUsers.find(u =>
                    (u.user_metadata?.role === 'PRINCIPAL' || u.app_metadata?.roles?.includes('PRINCIPAL')) &&
                    u.id !== userId
                );
                if (currentPrincipal) {
                    await supabaseAdmin.auth.admin.updateUserById(currentPrincipal.id, {
                        user_metadata: { ...currentPrincipal.user_metadata, role: 'STAFF' },
                        app_metadata: { roles: ['STAFF'] }
                    });
                    await supabaseAdmin.from('users').update({ roles: ['STAFF'] }).eq('id', currentPrincipal.id);
                }
            }
        }
        const { data: { user }, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getError) throw getError;
        const updatedMetadata = { ...user.user_metadata, role };
        if (departmentCode) {
            updatedMetadata.departmentCode = departmentCode;
            delete updatedMetadata.department;
        }
        const newRoles = role === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : [role, 'STAFF'];
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: updatedMetadata,
            app_metadata: { roles: newRoles }
        });
        if (updateError) throw updateError;
        await supabaseAdmin.from('users').update({ roles: newRoles }).eq('id', userId);
        res.json({ message: `Role ${role} assigned successfully` });
    } catch (error) {
        next(error);
    }
};

exports.getStaffDashboardData = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { staffId } = req.query;
        const { data: tutorship } = await supabaseAdmin.from('classes').select('id, name, semester, batch').eq('tutor_id', staffId).single();
        const { data: timetable } = await supabaseAdmin.from('timetables').select('*, class:classes(name, semester), subject:subjects(name, code)').eq('staff_id', staffId);
        let students = [];
        if (tutorship) {
            const { data } = await supabaseAdmin.from('students').select('id, admission_number, users(full_name, email)').eq('class_id', tutorship.id);
            students = (data || []).map(s => ({ id: s.id, name: s.users?.full_name, email: s.users?.email, admission: s.admission_number }));
        }
        res.json({ tutorship, timetable, students });
    } catch (error) {
        next(error);
    }
};

exports.getAttendanceSheet = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { classId, date, period } = req.query;
        const { data: students } = await supabaseAdmin.from('students').select('id, user_id, admission_number, users(full_name)').eq('class_id', classId);
        const { data: existing } = await supabaseAdmin.from('attendance').select('student_id, status').eq('class_id', classId).eq('date', date).eq('period', period);
        const attendanceMap = (existing || []).reduce((acc, a) => { acc[a.student_id] = a.status; return acc; }, {});
        const sheet = (students || []).map(s => ({ id: s.id, userId: s.user_id, name: s.users?.full_name, admission: s.admission_number, status: attendanceMap[s.id] || null }));
        res.json({ students: sheet });
    } catch (error) {
        next(error);
    }
};

exports.markAttendance = async (req, res, next) => {
    if (!ensureAdmin(res)) return;
    try {
        const { records } = req.body;
        const { error } = await supabaseAdmin.from('attendance').upsert(records, { onConflict: 'student_id,date,period' });
        if (error) throw error;
        res.json({ message: 'Attendance marked successfully' });
    } catch (error) {
        next(error);
    }
};

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}