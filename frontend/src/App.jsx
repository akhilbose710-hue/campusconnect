import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendanceView from './pages/AttendanceView';
import StudentProfile from './pages/StudentProfile';
import StaffProfile from './pages/StaffProfile';
import AdminPanel from './pages/AdminPanel';
import DeviceManagement from './pages/DeviceManagement';
import ReportsAnalytics from './pages/ReportsAnalytics';
import Unauthorized from './pages/Unauthorized';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/attendance" element={<AttendanceView />} />
              <Route path="/students/:id" element={<StudentProfile />} />
              <Route path="/staff/:id" element={<StaffProfile />} />
              <Route path="/reports" element={<ReportsAnalytics />} />

              <Route element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'IT_ADMIN']} />}>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/devices" element={<DeviceManagement />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

