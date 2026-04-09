import type {
  User,
  Task,
  Project,
  TaskStatus,
  TaskPriority,
  AutomationRule,
} from "@/shared/types";

const BASE_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "taskmate_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || res.statusText || "Request failed");
  }
  return json;
}

export async function login(username: string, password: string): Promise<User | null> {
  try {
    const json = await request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!json.success || !json.data) return null;
    setStoredToken(json.data.token);
    return json.data.user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Failed to fetch" || msg.includes("NetworkError"))
      throw new Error("Không kết nối được server. Kiểm tra BE đang chạy và VITE_API_URL đúng port.");
    return null;
  }
}

export async function getTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assigneeId?: string;
  projectId?: string;
  sortBy?: "deadline" | "createdAt" | "priority";
}): Promise<Task[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  const q = params.toString();
  const json = await request<Task[]>(`/api/tasks${q ? `?${q}` : ""}`);
  let list = json.data ?? [];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(s));
  }
  if (filters?.sortBy === "priority") {
    const rank: Record<TaskPriority, number> = { High: 3, Medium: 2, Low: 1 };
    list = [...list].sort((a, b) => rank[b.priority] - rank[a.priority]);
  } else {
    const key = filters?.sortBy === "createdAt" ? "createdAt" : "deadline";
    list = [...list].sort((a, b) => {
      if (a[key] === b[key]) return 0;
      if (key === "createdAt") return a[key] > b[key] ? -1 : 1; // newest first
      return a[key] < b[key] ? -1 : 1; // nearest deadline first
    });
  }
  return list;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const json = await request<Task>(`/api/tasks/${id}`);
  return json.data ?? null;
}

export async function createTask(data: {
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
  const json = await request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Create task failed");
  return json.data;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
  const json = await request<Task>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return json.data ?? null;
}

export async function deleteTask(id: string): Promise<boolean> {
  await request(`/api/tasks/${id}`, { method: "DELETE" });
  return true;
}

export async function getProfile(): Promise<User> {
  const json = await request<User>("/api/profile");
  if (!json.data) throw new Error("Get profile failed");
  return json.data;
}

export type ProfileUpdate = {
  age?: number | null;
  gender?: string | null;
  joinDate?: string | null;
  position?: string | null;
};

export async function updateProfile(data: ProfileUpdate, avatarFile?: File): Promise<User> {
  const token = getToken();
  const url = `${BASE_URL}/api/profile`;
  if (avatarFile != null) {
    const form = new FormData();
    form.append("avatar", avatarFile);
    if (data.age !== undefined) form.append("age", String(data.age ?? ""));
    if (data.gender !== undefined) form.append("gender", data.gender ?? "");
    if (data.joinDate !== undefined) form.append("joinDate", data.joinDate ?? "");
    if (data.position !== undefined) form.append("position", data.position ?? "");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { method: "PATCH", body: form, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || res.statusText || "Request failed");
    if (!json.data) throw new Error("Update profile failed");
    return json.data;
  }
  const json = await request<User>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Update profile failed");
  return json.data;
}

export async function getUsers(): Promise<User[]> {
  const json = await request<User[]>("/api/users");
  return json.data ?? [];
}

export async function createUser(data: {
  username: string;
  fullName: string;
  role: "USER";
  password?: string;
}): Promise<User> {
  const json = await request<User>("/api/users", {
    method: "POST",
    body: JSON.stringify({ ...data, password: data.password || "123456" }),
  });
  if (!json.data) throw new Error("Create user failed");
  return json.data;
}

export async function toggleUserDisabled(id: string): Promise<User | null> {
  const json = await request<User>(`/api/users/${id}`, {
    method: "PATCH",
  });
  return json.data ?? null;
}

export async function getDeletedUsers(): Promise<User[]> {
  const json = await request<User[]>("/api/users/trash");
  return json.data ?? [];
}

export async function deleteUser(id: string): Promise<User | null> {
  const json = await request<User>(`/api/users/${id}`, {
    method: "DELETE",
  });
  return json.data ?? null;
}

export async function restoreUser(id: string): Promise<User | null> {
  const json = await request<User>(`/api/users/${id}/restore`, {
    method: "PATCH",
  });
  return json.data ?? null;
}

export async function getProjects(): Promise<Project[]> {
  const json = await request<Project[]>("/api/projects");
  return json.data ?? [];
}

export async function createProject(data: {
  name: string;
  description: string;
}): Promise<Project> {
  const json = await request<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Create project failed");
  return json.data;
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "name" | "description">>
): Promise<Project | null> {
  const json = await request<Project>(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return json.data ?? null;
}

export async function deleteProject(id: string): Promise<boolean> {
  await request(`/api/projects/${id}`, { method: "DELETE" });
  return true;
}

export async function getDeletedProjects(): Promise<Project[]> {
  const json = await request<Project[]>("/api/projects/trash");
  return json.data ?? [];
}

export async function restoreProject(id: string): Promise<Project | null> {
  const json = await request<Project>(`/api/projects/${id}/restore`, { method: "PATCH" });
  return json.data ?? null;
}

// Automation: no BE API yet, keep mock
export async function getAutomationRules(): Promise<AutomationRule[]> {
  const { mockGetAutomationRules } = await import("./mock-client");
  return mockGetAutomationRules();
}

export async function createAutomationRule(data: {
  name: string;
  description: string;
  trigger: string;
}): Promise<AutomationRule> {
  const { mockCreateAutomationRule } = await import("./mock-client");
  return mockCreateAutomationRule(data);
}

// --- AI assistant ---
export async function aiChat(message: string): Promise<string> {
  const json = await request<{ reply: string; meta?: unknown }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  if (!json.data) throw new Error("AI assistant error");
  return json.data.reply;
}

export async function getDeletedTasks(): Promise<Task[]> {
  const json = await request<Task[]>("/api/tasks/trash");
  return json.data ?? [];
}

export async function restoreTask(id: string): Promise<Task | null> {
  const json = await request<Task>(`/api/tasks/${id}/restore`, { method: "PATCH" });
  return json.data ?? null;
}

export async function syncTasksToSheets(): Promise<{
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: unknown[];
}> {
  const json = await request<{
    total: number;
    synced: number;
    skipped: number;
    failed: number;
    errors: unknown[];
  }>(`/api/tasks/sync-sheets`, {
    method: "POST",
  });
  if (!json.data) throw new Error("Sync to Google Sheets failed");
  return json.data;
}
