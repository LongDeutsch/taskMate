// File: src/app/routes.tsx
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { AdminRoute } from "./components/admin-route";
import { MainLayout } from "./layouts/main-layout";
import { LoginPage } from "@/features/auth/pages/login-page";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { TaskListPage } from "@/features/tasks/pages/task-list-page";
import { TaskDetailPage } from "@/features/tasks/pages/task-detail-page";
import { AdminTasksPage } from "@/features/tasks/pages/admin-tasks-page";
import { AdminUsersPage } from "@/features/users/pages/admin-users-page";
import { AdminUserDetailPage } from "@/features/users/pages/admin-user-detail-page";
import { UsersPage } from "@/features/users/pages/users-page";
import { UserProfilePage } from "@/features/users/pages/user-profile-page";
import { AdminProjectsPage } from "@/features/projects/pages/admin-projects-page";
import { AdminProjectDetailPage } from "@/features/projects/pages/admin-project-detail-page";
import { AutomationPage } from "@/features/automation/pages/automation-page";
import { ProfilePage } from "@/features/profile/pages/profile-page";
import { AdminTrashPage } from "@/features/trash/pages/admin-trash-page";
import { TimeOffPage } from "@/features/time-off/pages/time-off-page";
import { BugReportsPage } from "@/features/bug-reports/pages/bug-reports-page";
import { HomeRedirect } from "./components/home-redirect";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "bug-reports", element: <BugReportsPage /> },
      { path: "tasks", element: <TaskListPage /> },
      { path: "tasks/:id", element: <TaskDetailPage /> },
      { path: "automation", element: <AutomationPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "users", element: <UsersPage /> },
      { path: "users/:id", element: <UserProfilePage /> },
      { path: "time-off", element: <TimeOffPage /> },
      {
        path: "admin/projects",
        element: (
          <AdminRoute>
            <AdminProjectsPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/projects/:id",
        element: (
          <AdminRoute>
            <AdminProjectDetailPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/tasks",
        element: (
          <AdminRoute>
            <AdminTasksPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/users",
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/trash",
        element: (
          <AdminRoute>
            <AdminTrashPage />
          </AdminRoute>
        ),
      },
      {
        path: "admin/users/:id",
        element: (
          <AdminRoute>
            <AdminUserDetailPage />
          </AdminRoute>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
