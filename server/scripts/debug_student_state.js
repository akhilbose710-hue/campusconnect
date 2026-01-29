require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function debugStudent() {
    const email = 'student1@campus.com';
    console.log(`Debugging user: ${email}`);

    // 1. Get User ID
    const { data: user } = await supabase.from('users').select('id, email').eq('email', email).single();
    if (!user) { console.log('User not found'); return; }

    // 2. Get Student Record
    const { data: student } = await supabase.from('students')
        .select('*, class:classes(*)')
        .eq('user_id', user.id)
        .single();

    console.log('Student Record:', JSON.stringify(student, null, 2));

    if (!student) return;

    // 3. Check Subjects
    const semester = student.semester || student.class?.semester;
    console.log(`Resolved Semester: ${semester}`);
    console.log(`Department: ${student.department}`);

    const { data: subjects } = await supabase.from('subjects')
        .select('*')
        .eq('department', student.department)
        .eq('semester', semester);

    console.log(`Found ${subjects?.length} subjects.`);

    // 4. Check Timetable
    if (student.class_id) {
        const { data: timetable } = await supabase.from('timetables')
            .select('*')
            .eq('class_id', student.class_id);
        console.log(`Found ${timetable?.length} timetable slots for Class ID ${student.class_id}.`);
    } else {
        console.log('No Class ID assigned to student.');
    }
}

debugStudent();
