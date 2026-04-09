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
  deletedAt?: string | null;
  restoreUntil?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  restoreUntil?: string | null;
}

export type TaskStatus = "Todo" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

/** Populated on API responses so USER role can show names without GET /users (admin-only). */
export interface TaskCollaborator {
  id: string;
  fullName: string;
  username: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName?: string | null;
  title: string;
  description: string;
  feedback?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string; // ISO date
  assigneeId: string | null;
  /** Resolved display name from API (list/detail). */
  assigneeName?: string | null;
  collaboratorIds?: string[];
  /** Resolved collaborator profiles from API (list/detail). */
  collaborators?: TaskCollaborator[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  restoreUntil?: string | null;
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
