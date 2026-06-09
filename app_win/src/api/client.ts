import type {
  TimeOffReason,
  TimeOffRecipient,
  TimeOffRequest,
  TimeOffSession,
  TimeOffStatus,
  User,
  BusinessTripScheduleItem,
} from "../types";

const TOKEN_KEY = "taskmate_xinoff_token";
const USER_KEY = "taskmate_xinoff_user";

let apiBaseUrl = "https://taskmate-be.onrender.com";

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, "");
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new Error(json.message || res.statusText || "Request failed");
  }
  return json as T;
}

export async function wakeApi(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/ping`, { signal: AbortSignal.timeout(90_000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(username: string, password: string): Promise<User> {
  const json = await request<{ success: boolean; data?: { user: User; token: string } }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) }
  );
  if (!json.success || !json.data) throw new Error("Đăng nhập thất bại");
  setSession(json.data.token, json.data.user);
  return json.data.user;
}

export async function getTimeOffRecipients(): Promise<TimeOffRecipient[]> {
  const json = await request<{ success: boolean; data?: TimeOffRecipient[] }>(
    "/api/time-off/recipients"
  );
  return json.data ?? [];
}

export async function getMyTimeOffs(): Promise<TimeOffRequest[]> {
  const json = await request<{ success: boolean; data?: TimeOffRequest[] }>("/api/time-off/mine");
  return json.data ?? [];
}

export async function getAllTimeOffs(status?: TimeOffStatus): Promise<TimeOffRequest[]> {
  const q = status ? `?status=${status}` : "";
  const json = await request<{ success: boolean; data?: TimeOffRequest[] }>(`/api/time-off${q}`);
  return json.data ?? [];
}

export interface CreateTimeOffPayload {
  startDate: string;
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  reasonOther?: string;
  details?: string;
  businessTripSchedule?: BusinessTripScheduleItem[];
  recipientIds?: string[];
  skipMail?: boolean;
}

export async function createTimeOff(payload: CreateTimeOffPayload): Promise<TimeOffRequest> {
  const json = await request<{ success: boolean; data?: TimeOffRequest }>("/api/time-off", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!json.data) throw new Error("Tạo yêu cầu thất bại");
  return json.data;
}

export async function cancelTimeOff(id: string): Promise<void> {
  await request(`/api/time-off/${id}`, { method: "DELETE" });
}

export async function setTimeOffStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<TimeOffRequest> {
  const json = await request<{ success: boolean; data?: TimeOffRequest }>(
    `/api/time-off/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
  if (!json.data) throw new Error("Cập nhật trạng thái thất bại");
  return json.data;
}
