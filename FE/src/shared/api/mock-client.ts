// File: src/shared/api/mock-client.ts
import type { User, Task, AutomationRule, TaskStatus, TaskPriority, Project } from "@/shared/types";
import {
  getStoredUsers,
  getStoredTasks,
  getStoredRules,
  getStoredProjects,
  setStoredUsers,
  setStoredTasks,
  setStoredRules,
  setStoredProjects,
} from "./mock-data";
import { getStoredAuthUser, setStoredAuthUser } from "@/features/auth/store/auth-store";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PROFILE_STORAGE_KEY = "taskmate_profile";

function getStoredProfile(): Record<string, Partial<User>> {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredProfile(profiles: Record<string, Partial<User>>) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export async function mockLogin(username: string, password: string): Promise<User | null> {
  await delay(400);
  const users = getStoredUsers();
  const user = users.find(
    (u) => !u.disabled && u.username === username && u.password === password
  );
  if (!user) return null;
  const { password: _, ...rest } = user;
  return rest as User;
}

export async function mockGetProfile(): Promise<User> {
  await delay(200);
  const user = getStoredAuthUser();
  if (!user) throw new Error("Chưa đăng nhập");
  const profiles = getStoredProfile();
  const profile = profiles[user.id] ?? {};
  return { ...user, ...profile } as User;
}

export async function mockUpdateProfile(
  data: { age?: number | null; gender?: string | null; joinDate?: string | null; position?: string | null },
  _avatarFile?: File
): Promise<User> {
  await delay(300);
  const user = getStoredAuthUser();
  if (!user) throw new Error("Chưa đăng nhập");
  const profiles = getStoredProfile();
  const current = profiles[user.id] ?? {};
  const updated = { ...user, ...current, ...data };
  profiles[user.id] = {
    age: updated.age,
    gender: updated.gender,
    joinDate: updated.joinDate,
    position: updated.position,
  };
  setStoredProfile(profiles);
  setStoredAuthUser(updated as User);
  return updated as User;
}

export async function mockGetTasks(filters?: {
  status?: TaskStatus;
  search?: string;
  assigneeId?: string;
  projectId?: string;
  sortBy?: "deadline" | "createdAt";
}): Promise<Task[]> {
  await delay(300);
  let list = [...getStoredTasks()];
  if (filters?.assigneeId) list = list.filter((t) => t.assigneeId === filters.assigneeId);
  if (filters?.projectId) list = list.filter((t) => t.projectId === filters.projectId);
  if (filters?.status) list = list.filter((t) => t.status === filters.status);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q));
  }
  const key = filters?.sortBy === "createdAt" ? "createdAt" : "deadline";
  list.sort((a, b) => (a[key] < b[key] ? -1 : 1));
  return list;
}

export async function mockGetTaskById(id: string): Promise<Task | null> {
  await delay(200);
  return getStoredTasks().find((t) => t.id === id) ?? null;
}

export async function mockCreateTask(data: {
  projectId: string;
  title: string;
  description: string;
  feedback?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  assigneeId: string | null;
  collaboratorIds?: string[];
}): Promise<Task> {
  await delay(300);
  const tasks = getStoredTasks();
  const now = new Date().toISOString();
  const task: Task = {
    id: `t-${Date.now()}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  setStoredTasks([...tasks, task]);
  return task;
}

export async function mockUpdateTask(id: string, data: Partial<Task>): Promise<Task | null> {
  await delay(300);
  const tasks = getStoredTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
  const next = [...tasks];
  next[idx] = updated;
  setStoredTasks(next);
  return updated;
}

export async function mockDeleteTask(id: string): Promise<boolean> {
  await delay(300);
  const tasks = getStoredTasks().filter((t) => t.id !== id);
  if (tasks.length === getStoredTasks().length) return false;
  setStoredTasks(tasks);
  return true;
}

export async function mockGetUsers(): Promise<User[]> {
  await delay(300);
  return getStoredUsers().map(({ password: _, ...u }) => u as User);
}

export async function mockCreateUser(data: {
  username: string;
  fullName: string;
  role: "USER";
}): Promise<User> {
  await delay(300);
  const users = getStoredUsers();
  const user: User = {
    id: `u-${Date.now()}`,
    ...data,
    disabled: false,
    password: "123456",
  };
  setStoredUsers([...users, user]);
  const { password: _, ...rest } = user;
  return rest as User;
}

export async function mockToggleUserDisabled(id: string): Promise<User | null> {
  await delay(300);
  const users = getStoredUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const next = users.map((u, i) =>
    i === idx ? { ...u, disabled: !u.disabled } : u
  );
  setStoredUsers(next);
  const { password: _, ...rest } = next[idx];
  return rest as User;
}

export async function mockGetAutomationRules(): Promise<AutomationRule[]> {
  await delay(300);
  return getStoredRules();
}

export async function mockCreateAutomationRule(data: {
  name: string;
  description: string;
  trigger: string;
}): Promise<AutomationRule> {
  await delay(300);
  const rules = getStoredRules();
  const rule: AutomationRule = {
    id: `r-${Date.now()}`,
    ...data,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  setStoredRules([...rules, rule]);
  return rule;
}

// --- Projects ---
export async function mockGetProjects(): Promise<Project[]> {
  await delay(200);
  return getStoredProjects();
}

export async function mockCreateProject(data: { name: string; description: string }): Promise<Project> {
  await delay(300);
  const projects = getStoredProjects();
  const now = new Date().toISOString();
  const project: Project = {
    id: `proj-${Date.now()}`,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  setStoredProjects([...projects, project]);
  return project;
}

export async function mockUpdateProject(id: string, data: Partial<Pick<Project, "name" | "description">>): Promise<Project | null> {
  await delay(300);
  const projects = getStoredProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...projects[idx], ...data, updatedAt: new Date().toISOString() };
  const next = [...projects];
  next[idx] = updated;
  setStoredProjects(next);
  return updated;
}

export async function mockDeleteProject(id: string): Promise<boolean> {
  await delay(300);
  const projects = getStoredProjects().filter((p) => p.id !== id);
  if (projects.length === getStoredProjects().length) return false;
  setStoredProjects(projects);
  const tasks = getStoredTasks().filter((t) => t.projectId !== id);
  setStoredTasks(tasks);
  return true;
}
