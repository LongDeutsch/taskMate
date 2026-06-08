import type {
  User,
  Task,
  Project,
  TaskStatus,
  TaskPriority,
  AutomationRule,
  AppNotification,
  TimeOffRequest,
  TimeOffRecipient,
  TimeOffSession,
  TimeOffReason,
  TimeOffStatus,
  BugReport,
  BugReportStatus,
  TodayBirthday,
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

const REQUEST_TIMEOUT_MS = 45_000;

function networkErrorMessage(): string {
  const be = BASE_URL || "BE (VITE_API_URL)";
  return `Không kết nối được API (${be}). Thường do BE Render đang ngủ (free tier) hoặc CORS — mở ${be}/health trong tab mới, đợi phản hồi rồi thử lại.`;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `API không phản hồi sau ${REQUEST_TIMEOUT_MS / 1000}s. BE Render có thể đang khởi động — thử lại sau 1 phút.`
      );
    }
    throw new Error(networkErrorMessage());
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      localStorage.removeItem("taskmate_auth_user");
      window.dispatchEvent(new Event("taskmate-auth-update"));
    }
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
  /** Có thể null cho self-note của admin. */
  projectId: string | null;
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

export async function deleteAllTasks(): Promise<number> {
  const json = await request<{ deletedCount: number }>("/api/tasks/all", {
    method: "DELETE",
  });
  return json.data?.deletedCount ?? 0;
}

export async function getProfile(): Promise<User> {
  const json = await request<User>("/api/profile");
  if (!json.data) throw new Error("Get profile failed");
  return json.data;
}

export async function getTodayBirthdays(): Promise<TodayBirthday[]> {
  const json = await request<TodayBirthday[]>("/api/birthdays/today");
  return json.data ?? [];
}

export type ProfileUpdate = {
  fullName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  joinDate?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  webmailUrl?: string | null;
  smtpHost?: string | null;
  webmailPassword?: string | null;
};

export async function updateProfile(data: ProfileUpdate, avatarFile?: File): Promise<User> {
  const token = getToken();
  const url = `${BASE_URL}/api/profile`;
  if (avatarFile != null) {
    const form = new FormData();
    form.append("avatar", avatarFile);
    if (data.fullName !== undefined) form.append("fullName", data.fullName ?? "");
    if (data.dateOfBirth !== undefined) form.append("dateOfBirth", data.dateOfBirth ?? "");
    if (data.gender !== undefined) form.append("gender", data.gender ?? "");
    if (data.joinDate !== undefined) form.append("joinDate", data.joinDate ?? "");
    if (data.position !== undefined) form.append("position", data.position ?? "");
    if (data.phone !== undefined) form.append("phone", data.phone ?? "");
    if (data.email !== undefined) form.append("email", data.email ?? "");
    if (data.webmailUrl !== undefined) form.append("webmailUrl", data.webmailUrl ?? "");
    if (data.smtpHost !== undefined) form.append("smtpHost", data.smtpHost ?? "");
    if (data.webmailPassword) form.append("webmailPassword", data.webmailPassword);
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

export async function getUserById(id: string): Promise<User> {
  const json = await request<User>(`/api/users/${id}`);
  if (!json.data) throw new Error("User not found");
  return json.data;
}

export async function createUser(data: {
  username: string;
  fullName: string;
  email?: string | null;
  /** Label hiển thị: ADMIN / STAFF / HR / BODS. Mặc định STAFF. */
  roleLabel?: "ADMIN" | "STAFF" | "HR" | "BODS";
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

export async function deleteAllUsers(): Promise<number> {
  const json = await request<{ deletedCount: number }>("/api/users/all", {
    method: "DELETE",
  });
  return json.data?.deletedCount ?? 0;
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

export async function deleteAllProjects(): Promise<number> {
  const json = await request<{ deletedCount: number }>("/api/projects/all", {
    method: "DELETE",
  });
  return json.data?.deletedCount ?? 0;
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

export async function getDeletedTasks(): Promise<Task[]> {
  const json = await request<Task[]>("/api/tasks/trash");
  return json.data ?? [];
}

export async function restoreTask(id: string): Promise<Task | null> {
  const json = await request<Task>(`/api/tasks/${id}/restore`, { method: "PATCH" });
  return json.data ?? null;
}

export async function userUpdateTask(
  id: string,
  data: { status: TaskStatus }
): Promise<Task> {
  const json = await request<Task>(`/api/tasks/${id}/user-update`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Cập nhật task thất bại");
  return json.data;
}

export async function saveResponseDraft(id: string, draft: string): Promise<Task> {
  const json = await request<Task>(`/api/tasks/${id}/response/draft`, {
    method: "PATCH",
    body: JSON.stringify({ userResponseDraft: draft }),
  });
  if (!json.data) throw new Error("Lưu nháp thất bại");
  return json.data;
}

export interface SendResponseResult {
  task: Task;
  undoToken: string | null;
  kind: "sent" | "edit" | "append";
}

export async function sendResponse(id: string, content: string): Promise<SendResponseResult> {
  const url = `${BASE_URL}/api/tasks/${id}/response/send`;
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: Task;
    undoToken?: string | null;
    kind?: "sent" | "edit" | "append";
    message?: string;
  };
  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      localStorage.removeItem("taskmate_auth_user");
      window.dispatchEvent(new Event("taskmate-auth-update"));
    }
    throw new Error(json.message || res.statusText || "Gửi phản hồi thất bại");
  }
  if (!json.data) throw new Error("Gửi phản hồi thất bại");
  return {
    task: json.data,
    undoToken: json.undoToken ?? null,
    kind: json.kind ?? "sent",
  };
}

export async function undoResponse(id: string, undoToken: string): Promise<Task> {
  const json = await request<Task>(`/api/tasks/${id}/response/undo`, {
    method: "POST",
    body: JSON.stringify({ undoToken }),
  });
  if (!json.data) throw new Error("Hoàn tác thất bại");
  return json.data;
}

export async function getNotifications(opts?: { unread?: boolean; limit?: number }): Promise<{
  items: AppNotification[];
  unreadCount: number;
}> {
  const params = new URLSearchParams();
  if (opts?.unread) params.set("unread", "true");
  if (opts?.limit) params.set("limit", String(opts.limit));
  const q = params.toString();
  const json = await request<{ items: AppNotification[]; unreadCount: number }>(
    `/api/notifications${q ? `?${q}` : ""}`
  );
  return json.data ?? { items: [], unreadCount: 0 };
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const json = await request<{ id: string; read: boolean }>(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
  return !!json.data?.read;
}

export async function markAllNotificationsRead(): Promise<number> {
  const json = await request<{ matched: number; modified: number }>(
    `/api/notifications/read-all`,
    { method: "POST" }
  );
  return json.data?.modified ?? 0;
}

// --- Time-off requests ---
export interface CreateTimeOffPayload {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  reasonOther?: string;
  details?: string;
  businessTripSchedule?: import("@/shared/types").BusinessTripScheduleItem[];
  recipientIds?: string[];
}

export type CreateTimeOffResult = {
  request: TimeOffRequest;
  mail?: {
    sent?: string[];
    failed?: string[];
    error?: string;
    note?: string;
    queued?: boolean;
    recipients?: string[];
    skipped?: boolean;
    details?: { to: string; messageId: string | null; response: string | null }[];
  } | null;
};

export async function createTimeOff(payload: CreateTimeOffPayload): Promise<CreateTimeOffResult> {
  const json = await request<TimeOffRequest>("/api/time-off", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!json.data) throw new Error("Tạo yêu cầu xin off thất bại");
  const full = json as { data?: TimeOffRequest; mail?: CreateTimeOffResult["mail"] };
  return { request: full.data!, mail: full.mail ?? null };
}

export async function getTimeOffRecipients(): Promise<TimeOffRecipient[]> {
  const json = await request<TimeOffRecipient[]>("/api/time-off/recipients");
  return json.data ?? [];
}

export async function getMyTimeOffs(): Promise<TimeOffRequest[]> {
  const json = await request<TimeOffRequest[]>("/api/time-off/mine");
  return json.data ?? [];
}

export async function getAllTimeOffs(opts?: { status?: TimeOffStatus }): Promise<TimeOffRequest[]> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  const q = params.toString();
  const json = await request<TimeOffRequest[]>(`/api/time-off${q ? `?${q}` : ""}`);
  return json.data ?? [];
}

export async function cancelTimeOff(id: string): Promise<boolean> {
  const json = await request<{ id: string }>(`/api/time-off/${id}`, { method: "DELETE" });
  return !!json.data;
}

export async function setTimeOffStatus(
  id: string,
  status: "approved" | "rejected",
  decisionNote?: string
): Promise<TimeOffRequest> {
  const json = await request<TimeOffRequest>(`/api/time-off/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, decisionNote }),
  });
  if (!json.data) throw new Error("Cập nhật trạng thái thất bại");
  return json.data;
}

export async function getBugReports(): Promise<BugReport[]> {
  const json = await request<BugReport[]>("/api/bug-reports");
  return json.data ?? [];
}

export async function getBugReportById(id: string): Promise<BugReport | null> {
  const json = await request<BugReport>(`/api/bug-reports/${id}`);
  return json.data ?? null;
}

export async function getOpenBugReports(): Promise<BugReport[]> {
  const json = await request<BugReport[]>("/api/bug-reports/open");
  return json.data ?? [];
}

export async function createBugReport(data: {
  title: string;
  content: string;
}): Promise<BugReport> {
  const json = await request<BugReport>("/api/bug-reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Tạo bug report thất bại");
  return json.data;
}

export async function updateBugReport(
  id: string,
  data: { title: string; content: string }
): Promise<BugReport> {
  const json = await request<BugReport>(`/api/bug-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!json.data) throw new Error("Cập nhật bug thất bại");
  return json.data;
}

export async function updateBugReportStatus(
  id: string,
  status: BugReportStatus
): Promise<BugReport> {
  const json = await request<BugReport>(`/api/bug-reports/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!json.data) throw new Error("Cập nhật trạng thái bug thất bại");
  return json.data;
}

export async function deleteBugReport(id: string): Promise<boolean> {
  await request(`/api/bug-reports/${id}`, { method: "DELETE" });
  return true;
}
