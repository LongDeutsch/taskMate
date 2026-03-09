// File: src/shared/api/mock-data.ts
import type { User, Task, AutomationRule, Project } from "@/shared/types";

export const MOCK_USERS: User[] = [
  {
    id: "u-pm",
    username: "pm",
    fullName: "Project Manager (PM)",
    role: "ADMIN",
    disabled: false,
    password: "admin123",
  },
  {
    id: "u-admin",
    username: "admin",
    fullName: "Administrator",
    role: "ADMIN",
    disabled: false,
    password: "admin123",
  },
  {
    id: "u-1",
    username: "user1",
    fullName: "Nguyen Van A",
    role: "USER",
    disabled: false,
    password: "123456",
  },
  {
    id: "u-2",
    username: "user2",
    fullName: "Tran Thi B",
    role: "USER",
    disabled: false,
    password: "123456",
  },
];

const now = new Date();
const d = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

export const MOCK_PROJECTS: Project[] = [
  { id: "proj-1", name: "TaskMate App", description: "Ứng dụng quản lý công việc", createdAt: d(-30).toISOString(), updatedAt: d(0).toISOString() },
  { id: "proj-2", name: "Website Công ty", description: "Website giới thiệu công ty", createdAt: d(-20).toISOString(), updatedAt: d(-5).toISOString() },
  { id: "proj-3", name: "Mobile App", description: "Ứng dụng di động", createdAt: d(-10).toISOString(), updatedAt: d(-2).toISOString() },
];

export const MOCK_TASKS: Task[] = [
  {
    id: "t-1",
    projectId: "proj-1",
    title: "Setup project repository",
    description: "Initialize Git repo and CI pipeline",
    status: "Done",
    priority: "High",
    deadline: d(5).toISOString().slice(0, 10),
    assigneeId: "u-1",
    createdAt: d(-10).toISOString(),
    updatedAt: d(-2).toISOString(),
  },
  {
    id: "t-2",
    projectId: "proj-1",
    title: "Design database schema",
    description: "ERD and migrations for core entities",
    status: "InProgress",
    priority: "High",
    deadline: d(3).toISOString().slice(0, 10),
    assigneeId: "u-2",
    createdAt: d(-8).toISOString(),
    updatedAt: d(0).toISOString(),
  },
  {
    id: "t-3",
    projectId: "proj-1",
    title: "Implement auth module",
    description: "Login, logout, session handling",
    status: "InProgress",
    priority: "Medium",
    deadline: d(7).toISOString().slice(0, 10),
    assigneeId: "u-1",
    createdAt: d(-5).toISOString(),
    updatedAt: d(0).toISOString(),
  },
  {
    id: "t-4",
    projectId: "proj-1",
    title: "API documentation",
    description: "OpenAPI/Swagger for all endpoints",
    status: "Todo",
    priority: "Low",
    deadline: d(14).toISOString().slice(0, 10),
    assigneeId: null,
    createdAt: d(-3).toISOString(),
    updatedAt: d(-3).toISOString(),
  },
  {
    id: "t-5",
    projectId: "proj-1",
    title: "Frontend dashboard",
    description: "Dashboard layout and charts",
    status: "Todo",
    priority: "Medium",
    deadline: d(10).toISOString().slice(0, 10),
    assigneeId: "u-2",
    createdAt: d(-2).toISOString(),
    updatedAt: d(-2).toISOString(),
  },
  {
    id: "t-6",
    projectId: "proj-2",
    title: "Unit tests for API",
    description: "Jest tests for task and user APIs",
    status: "Todo",
    priority: "Medium",
    deadline: d(6).toISOString().slice(0, 10),
    assigneeId: "u-1",
    createdAt: d(-1).toISOString(),
    updatedAt: d(-1).toISOString(),
  },
  {
    id: "t-7",
    projectId: "proj-2",
    title: "Deploy to staging",
    description: "Docker and staging environment",
    status: "Todo",
    priority: "High",
    deadline: d(2).toISOString().slice(0, 10),
    assigneeId: "u-2",
    createdAt: d(-4).toISOString(),
    updatedAt: d(-4).toISOString(),
  },
  {
    id: "t-8",
    projectId: "proj-3",
    title: "User acceptance testing",
    description: "UAT with stakeholders",
    status: "Todo",
    priority: "Low",
    deadline: d(21).toISOString().slice(0, 10),
    assigneeId: null,
    createdAt: d(-7).toISOString(),
    updatedAt: d(-7).toISOString(),
  },
];

export const MOCK_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "r-1",
    name: "Deadline 1 day before",
    description: "Send reminder 1 day before task deadline",
    trigger: "1 day before deadline",
    enabled: true,
    createdAt: d(-30).toISOString(),
  },
  {
    id: "r-2",
    name: "Overdue alert",
    description: "Notify when task passes deadline",
    trigger: "On deadline date",
    enabled: true,
    createdAt: d(-20).toISOString(),
  },
  {
    id: "r-3",
    name: "Weekly digest",
    description: "Summary of tasks due this week",
    trigger: "Every Monday 9:00",
    enabled: false,
    createdAt: d(-10).toISOString(),
  },
];

const STORAGE_KEYS = {
  USERS: "taskmate_users",
  PROJECTS: "taskmate_projects",
  TASKS: "taskmate_tasks",
  RULES: "taskmate_automation_rules",
} as const;

function seedIfEmpty<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T[];
    }
  } catch {
    // ignore
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

/** Trả về users; nếu cache cũ không có "pm" thì bổ sung các user mặc định từ MOCK_USERS. */
export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
      return MOCK_USERS;
    }
    const stored = JSON.parse(raw) as User[];
    const hasPm = stored.some((u) => u.username === "pm");
    if (!hasPm) {
      const usernames = new Set(stored.map((u) => u.username));
      const toAdd = MOCK_USERS.filter((u) => !usernames.has(u.username));
      const merged = [...stored, ...toAdd];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    return MOCK_USERS;
  }
}

export function getStoredProjects(): Project[] {
  return seedIfEmpty(STORAGE_KEYS.PROJECTS, MOCK_PROJECTS);
}

export function setStoredProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

/** Returns tasks; migrates legacy tasks without projectId to first project. */
export function getStoredTasks(): Task[] {
  const projects = getStoredProjects();
  const defaultProjectId = projects[0]?.id ?? "proj-1";
  const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(MOCK_TASKS));
    return MOCK_TASKS;
  }
  try {
    const parsed = JSON.parse(raw) as (Task & { projectId?: string })[];
    let needsSave = false;
    const migrated = parsed.map((t) => {
      if (t.projectId) return t as Task;
      needsSave = true;
      return { ...t, projectId: defaultProjectId } as Task;
    });
    if (needsSave) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(migrated));
    return migrated;
  } catch {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(MOCK_TASKS));
    return MOCK_TASKS;
  }
}

export function getStoredRules(): AutomationRule[] {
  return seedIfEmpty(STORAGE_KEYS.RULES, MOCK_AUTOMATION_RULES);
}

export function setStoredUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function setStoredTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function setStoredRules(rules: AutomationRule[]): void {
  localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
}
