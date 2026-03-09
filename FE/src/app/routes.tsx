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
import { AdminProjectsPage } from "@/features/projects/pages/admin-projects-page";
import { AdminProjectDetailPage } from "@/features/projects/pages/admin-project-detail-page";
import { AutomationPage } from "@/features/automation/pages/automation-page";
import { ProfilePage } from "@/features/profile/pages/profile-page";

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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "tasks", element: <TaskListPage /> },
      { path: "tasks/:id", element: <TaskDetailPage /> },
      { path: "automation", element: <AutomationPage /> },
      { path: "profile", element: <ProfilePage /> },
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
