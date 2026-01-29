const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Stats
router.get('/stats', adminController.getStats);

// Users
router.post('/users', adminController.createUser);
router.post('/users/bulk', adminController.bulkCreateUsers);
router.get('/users', adminController.listUsers);
router.delete('/users/:id', adminController.deleteUser);
router.post('/promote', adminController.promoteStudents);
router.get('/staff', adminController.listStaff);

// Departments
router.get('/departments', adminController.listDepartments);
router.post('/departments', adminController.createDepartment);
router.put('/departments/:id', adminController.updateDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);

// Classes
router.get('/classes', adminController.listClasses);
router.post('/classes', adminController.createClass);
router.get('/classes/:id/students', adminController.getClassStudents);
router.put('/classes/:id', adminController.updateClass);
router.delete('/classes/:id', adminController.deleteClass);

// Subjects
router.get('/subjects', adminController.listSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// Timetable
router.get('/timetable', adminController.getTimetable);
router.post('/timetable', adminController.upsertTimetable);
router.delete('/timetable/:classId', adminController.resetTimetable);

// Roles
router.post('/assign-role', adminController.assignRole);

// Staff/Lecturer Specific
router.get('/staff-dashboard-data', adminController.getStaffDashboardData);
router.get('/attendance-sheet', adminController.getAttendanceSheet);
router.post('/mark-attendance', adminController.markAttendance);

module.exports = router;