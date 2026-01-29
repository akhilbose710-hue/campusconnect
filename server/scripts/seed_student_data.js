require('dotenv').config({ path: '../.env' }); // Adjust path if running from scripts folder
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY || !SUPABASE_URL) {
    console.error('ERROR: Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const SUBJECTS_DATA = {
    'CS': {
        1: [
            { code: 'MAT101', name: 'Calculus I', type: 'Core', credits: 4 },
            { code: 'CS101', name: 'Intro to Computing', type: 'Core', credits: 3 },
            { code: 'PHY101', name: 'Eng. Physics', type: 'Core', credits: 4 }
        ],
        4: [
            { code: 'CS202', name: 'Computer Org.', type: 'Core', credits: 3 },
            { code: 'CS204', name: 'Algorithms', type: 'Core', credits: 4 },
            { code: 'MAT206', name: 'Prob. & Stats', type: 'Core', credits: 3 },
            { code: 'CS208', name: 'OS Lab', type: 'Lab', credits: 2 }
        ],
        6: [
            { code: 'CS302', name: 'Compiler Design', type: 'Core', credits: 4 },
            { code: 'CS304', name: 'Computer Networks', type: 'Core', credits: 3 },
            { code: 'CS306', name: 'AI & ML', type: 'Elective', credits: 3 }
        ]
    }
};

async function seedStudentData() {
    try {
        console.log('--- Starting Student Data Seeding ---');

        // 1. Fetch Existing Students to Map Classes
        const { data: students, error: sErr } = await supabase.from('students').select('*');
        if (sErr) throw sErr;

        console.log(`Found ${students.length} students.`);

        // 2. Ensuring Classes exist for S4/S6 as per seed_users.js (which only made S1)
        // We need to fix the class assignment for students who are supposed to be in S4/S6
        // student1 (CS) -> S4
        // student5 (CS) -> S6

        // Let's create S4 and S6 classes for CS if they don't exist
        for (const sem of [4, 6]) {
            const { data: existingClass } = await supabase.from('classes')
                .select('*')
                .eq('department_code', 'CS')
                .eq('semester', sem)
                .maybeSingle();

            if (!existingClass) {
                console.log(`Creating CS S${sem} Class...`);
                // Get a tutor (optional, just pick first staff)
                const { data: staff } = await supabase.from('staff').select('user_id').eq('department', 'CS').limit(1).maybeSingle();

                await supabase.from('classes').insert({
                    name: `CS S${sem} A`,
                    department_code: 'CS',
                    semester: sem,
                    batch: 'A',
                    tutor_id: staff?.user_id
                });
            }
        }

        // 3. Re-fetch classes to get IDs
        const { data: classes } = await supabase.from('classes').select('*');

        // 4. Update Students to Correct Classes
        // student1@campus.com -> CS S4
        // student5@campus.com -> CS S6
        const studentMappings = [
            { email: 'student1@campus.com', dept: 'CS', sem: 4 },
            { email: 'student5@campus.com', dept: 'CS', sem: 6 }
        ];

        for (const map of studentMappings) {
            const targetClass = classes.find(c => c.department_code === map.dept && c.semester === map.sem);
            const { data: user } = await supabase.from('users').select('id').eq('email', map.email).single();

            if (user && targetClass) {
                console.log(`Updating ${map.email} to Class ${targetClass.name} and Semester ${map.sem}...`);
                const { error: updateError } = await supabase.from('students')
                    .update({
                        class_id: targetClass.id,
                        semester: map.sem // Explicitly setting semester
                    })
                    .eq('user_id', user.id);

                if (updateError) console.error(`Error updating student ${map.email}:`, updateError);
            } else {
                console.log(`User ${map.email} or Class not found. Please run seed_users.js first.`);
            }
        }

        // 5. Seed Subjects
        console.log('Seeding Subjects...');
        let allSubjects = [];

        // Clear existing subjects for clean seed (optional, but safer to avoid dupes if running multiple times)
        // await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 

        for (const [dept, sems] of Object.entries(SUBJECTS_DATA)) {
            for (const [sem, subs] of Object.entries(sems)) {
                for (const sub of subs) {
                    // Check if exists
                    const { data: existing } = await supabase.from('subjects')
                        .select('id')
                        .eq('code', sub.code)
                        .maybeSingle();

                    if (!existing) {
                        const { data: newSub } = await supabase.from('subjects').insert({
                            ...sub,
                            department: dept,
                            semester: parseInt(sem)
                        }).select().single();
                        allSubjects.push(newSub);
                    } else {
                        allSubjects.push({ ...sub, id: existing.id });
                    }
                }
            }
        }

        // 6. Seed Timetables
        console.log('Seeding Timetables...');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

        for (const cls of classes) {
            // Only seed for CS classes we care about for now
            if (cls.department_code === 'CS') {
                const subjectsForClass = allSubjects.filter(s => s?.semester === cls.semester); // Basic logic
                if (subjectsForClass.length === 0) continue;

                // Get a staff member
                const { data: staff } = await supabase.from('staff').select('user_id').eq('department', 'CS').limit(1).maybeSingle();

                for (const day of days) {
                    for (let period = 1; period <= 5; period++) {
                        // Round robin subjects
                        const subject = subjectsForClass[(period + days.indexOf(day)) % subjectsForClass.length];

                        // Check if slot exists
                        const { data: existingSlot } = await supabase.from('timetables')
                            .select('*')
                            .eq('class_id', cls.id)
                            .eq('day_of_week', day)
                            .eq('period', period)
                            .maybeSingle();

                        if (!existingSlot && subject) {
                            await supabase.from('timetables').insert({
                                class_id: cls.id,
                                subject_id: subject.id,
                                staff_id: staff?.user_id,
                                day_of_week: day,
                                period: period,
                                start_time: `${8 + period}:00:00`,
                                end_time: `${9 + period}:00:00`
                            });
                        }
                    }
                }
            }
        }

        // 7. Seed Attendance (Mock for last 5 days)
        console.log('Seeding Attendance...');
        const today = new Date();
        const { data: csStudents } = await supabase.from('students').select('*').eq('department', 'CS');

        for (const stud of csStudents) {
            // Get student's class timetables
            const { data: studTimetable } = await supabase.from('timetables').select('*').eq('class_id', stud.class_id);
            if (!studTimetable || studTimetable.length === 0) continue;

            for (let i = 0; i < 5; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dayName = days[date.getDay() - 1]; // 0 is Sun, 1 is Mon... adjusted for array

                if (!dayName) continue; // Skip weekend

                const dailySlots = studTimetable.filter(t => t.day_of_week === dayName);

                for (const slot of dailySlots) {
                    // Random status
                    const status = Math.random() > 0.2 ? 'PRESENT' : 'ABSENT';

                    // Check duplicate
                    const { data: existAtt } = await supabase.from('attendance')
                        .select('id')
                        .eq('student_id', stud.id)
                        .eq('date', date.toISOString().split('T')[0])
                        .eq('period', slot.period)
                        .maybeSingle();

                    if (!existAtt) {
                        await supabase.from('attendance').insert({
                            student_id: stud.id,
                            class_id: stud.class_id,
                            subject_id: slot.subject_id,
                            period: slot.period,
                            date: date.toISOString().split('T')[0],
                            status: status,
                            marked_by: slot.staff_id
                        });
                    }
                }
            }
        }


        console.log('--- Student Data Seeding Complete ---');

    } catch (err) {
        console.error('Seeding Error:', err);
    }
}

seedStudentData();
