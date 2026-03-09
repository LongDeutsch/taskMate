// File: src/shared/types/index.ts
export type Role = "ADMIN" | "USER";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  disabled: boolean;
  password?: string; // only for mock; never expose in real API
  age?: number | null;
  gender?: string | null;
  joinDate?: string | null;
  position?: string | null;
  avatar?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "Todo" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string; // ISO date
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string; // e.g. "1 day before deadline"
  enabled: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}
