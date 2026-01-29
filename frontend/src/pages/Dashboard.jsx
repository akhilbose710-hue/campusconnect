import React from 'react';
import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import PrincipalDashboard from './dashboards/PrincipalDashboard';
import HODDashboard from './dashboards/HODDashboard';
import StaffDashboard from './dashboards/StaffDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import LabAssistantDashboard from './dashboards/LabAssistantDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import LibrarianDashboard from './dashboards/LibrarianDashboard';
import ITAdminDashboard from './dashboards/ITAdminDashboard';

export default function Dashboard() {
  const { roles, user } = useAuth();
  const primaryRole = roles[0];

  if (!primaryRole) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-lg m-4 border border-red-200">
        <h3 className="text-lg font-bold mb-2">Access Denied: No Role Assigned</h3>
        <p className="mb-4">Your account does not have any roles assigned.</p>

        <div className="text-left text-xs bg-white p-4 rounded border font-mono">
          <p><strong>Debug Info:</strong></p>
          <p>User Email: {user?.email}</p>
          <p>User ID: {user?.id}</p>
          <p>Roles (Context): {JSON.stringify(roles)}</p>
          <p>App Metadata: {JSON.stringify(user?.app_metadata)}</p>
          <p><em>Tip: Try logging out and back in. If problem persists, run the seed script.</em></p>
        </div>
      </div>
    );
  }

  switch (primaryRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'PRINCIPAL':
      return <PrincipalDashboard />;
    case 'HOD':
      return <HODDashboard />;
    case 'STAFF':
      return <StaffDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    case 'LAB_ASSISTANT':
      return <LabAssistantDashboard />;
    case 'ACCOUNTANT':
      return <AccountantDashboard />;
    case 'LIBRARIAN':
      return <LibrarianDashboard />;
    case 'IT_ADMIN':
      return <ITAdminDashboard />;
    default:
      return <div className="text-sm text-slate-600">Unsupported role: {primaryRole}</div>;
  }
}

