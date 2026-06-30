// File: src/shared/types/index.ts
export type Role = "ADMIN" | "USER";

/** Label vai trò hiển thị (HR / Staff / Admin / BODs). */
export type RoleLabel = "ADMIN" | "STAFF" | "HR" | "BODS";

export interface TodayBirthday {
  id: string;
  fullName: string;
  dateOfBirth: string;
  age: number | null;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  /** Vai trò hiển thị; admin map tới quyền PM, các loại còn lại tạm thời như staff. */
  roleLabel?: RoleLabel;
  disabled: boolean;
  password?: string; // only for mock; never expose in real API
  dateOfBirth?: string | null;
  age?: number | null;
  gender?: string | null;
  joinDate?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  webmailUrl?: string | null;
  smtpHost?: string | null;
  /** Đã cấu hình mật khẩu webmail (không trả mật khẩu) */
  hasWebmailPassword?: boolean;
  avatar?: string | null;
  deletedAt?: string | null;
  restoreUntil?: string | null;
}

export const DEFAULT_WEBMAIL_URL = "https://mail.cybertech.com.vn/mail/";
export const DEFAULT_SMTP_HOST = "mail.cybertech.com.vn";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  restoreUntil?: string | null;
}

/** Label hiển thị (Admin / Staff / HR / BODs) suy ra từ User. */
export function getRoleLabel(user: { role: Role; roleLabel?: RoleLabel | null }): RoleLabel {
  if (user.roleLabel) return user.roleLabel;
  return user.role === "ADMIN" ? "ADMIN" : "STAFF";
}

/** Tên hiển thị tiếng Việt cho RoleLabel, dùng trên UI. */
export function formatRoleLabel(label: RoleLabel): string {
  switch (label) {
    case "ADMIN":
      return "Admin";
    case "STAFF":
      return "Staff";
    case "HR":
      return "HR";
    case "BODS":
      return "BODs";
    default:
      return label;
  }
}

export type TaskStatus = "Todo" | "InProgress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";

/** Populated on API responses so USER role can show names without GET /users (admin-only). */
export interface TaskCollaborator {
  id: string;
  fullName: string;
  username: string;
}

export type ResponseHistoryKind = "sent" | "edit" | "append";

export interface ResponseHistoryEntry {
  id: string;
  content: string;
  kind: ResponseHistoryKind;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export type FeedbackHistoryKind = "sent" | "edit";

export interface FeedbackHistoryEntry {
  id: string;
  content: string;
  kind: FeedbackHistoryKind;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface Task {
  id: string;
  /** Null cho self-note của admin (không gắn project). */
  projectId: string | null;
  projectName?: string | null;
  title: string;
  description: string;
  feedback?: string;
  /** Mốc thời gian PM cập nhật feedback gần nhất. */
  feedbackUpdatedAt?: string | null;
  /** Lịch sử các lần PM gửi/chỉnh feedback (user xem được). */
  feedbackHistory?: FeedbackHistoryEntry[];
  /** Phản hồi mới nhất của USER (assignee/collaborator) gửi cho PM. */
  userResponse?: string;
  /** Bản nháp đang soạn (chỉ user thấy). */
  userResponseDraft?: string;
  /** Lịch sử các lần gửi/chỉnh sửa/bổ sung phản hồi. */
  userResponseHistory?: ResponseHistoryEntry[];
  /** Mốc thời gian user gửi phản hồi gần nhất. */
  userResponseSentAt?: string | null;
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

export type NotificationType =
  | "task_assigned"
  | "task_collaborator"
  | "task_reassigned"
  | "task_updated"
  | "task_user_update"
  | "deadline_reminder"
  | "overdue_alert"
  | "time_off_submitted"
  | "time_off_status_updated";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId: string | null;
  taskTitle: string;
  /** Tham chiếu Time-off request (cho type "time_off_*"). */
  timeOffId?: string | null;
  actorId: string | null;
  actorName: string;
  changeSummary?: string;
  read: boolean;
  createdAt: string;
}

export type TimeOffSession = "MORNING" | "AFTERNOON" | "FULL";
export type TimeOffReason =
  | "ANNUAL_LEAVE"
  | "WFH"
  | "LATE_ARRIVAL"
  | "EARLY_LEAVE"
  | "BUSINESS_TRIP"
  | "OTHER";
export type TimeOffStatus = "pending" | "approved" | "rejected";

export interface BusinessTripScheduleItem {
  startDate: string;
  endDate: string;
  staff: string;
  location: string;
  description: string;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  userRoleLabel?: RoleLabel | null;
  recipientIds?: string[];
  recipients?: TimeOffRecipient[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  reasonOther?: string;
  details?: string;
  businessTripSchedule?: BusinessTripScheduleItem[];
  status: TimeOffStatus;
  decidedById?: string | null;
  decidedByName?: string;
  decidedAt?: string | null;
  decisionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeOffRecipient {
  id: string;
  username: string;
  fullName: string;
  role?: Role;
  roleLabel?: RoleLabel | null;
  email?: string;
  isDefault?: boolean;
}

export function formatTimeOffSession(s: TimeOffSession): string {
  switch (s) {
    case "MORNING":
      return "Sáng";
    case "AFTERNOON":
      return "Chiều";
    case "FULL":
      return "Cả ngày";
    default:
      return s;
  }
}

export function formatTimeOffReason(r: TimeOffReason): string {
  switch (r) {
    case "ANNUAL_LEAVE":
      return "Nghỉ phép";
    case "WFH":
      return "Work from home";
    case "LATE_ARRIVAL":
      return "Xin đi trễ";
    case "EARLY_LEAVE":
      return "Xin về sớm";
    case "BUSINESS_TRIP":
      return "Công tác";
    case "OTHER":
      return "Khác";
    default:
      return r;
  }
}

export type BugReportStatus = "todo" | "in_progress" | "done";

export interface BugReport {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  status: BugReportStatus;
  createdAt: string;
  updatedAt: string;
}

export function formatBugStatus(status: BugReportStatus): string {
  switch (status) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    default:
      return status;
  }
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
