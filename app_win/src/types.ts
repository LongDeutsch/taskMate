export type RoleLabel = "ADMIN" | "STAFF" | "HR" | "BODS";
export type TimeOffSession = "MORNING" | "AFTERNOON" | "FULL";
export type TimeOffReason =
  | "ANNUAL_LEAVE"
  | "WFH"
  | "LATE_ARRIVAL"
  | "EARLY_LEAVE"
  | "BUSINESS_TRIP"
  | "OTHER";
export type TimeOffStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "USER";
  roleLabel?: RoleLabel | null;
  email?: string | null;
}

export interface BusinessTripScheduleItem {
  startDate: string;
  endDate: string;
  staff: string;
  location: string;
  description: string;
}

export interface TimeOffRecipient {
  id: string;
  username: string;
  fullName: string;
  roleLabel?: RoleLabel | null;
  email?: string;
  isDefault?: boolean;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  userRoleLabel?: RoleLabel | null;
  recipientIds?: string[];
  recipients?: TimeOffRecipient[];
  startDate: string;
  endDate: string;
  session: TimeOffSession;
  reason: TimeOffReason;
  reasonOther?: string;
  details?: string;
  businessTripSchedule?: BusinessTripScheduleItem[];
  status: TimeOffStatus;
  decidedByName?: string;
  decidedAt?: string | null;
  createdAt: string;
}

export function getRoleLabel(user: User): RoleLabel {
  if (user.roleLabel) return user.roleLabel;
  return user.role === "ADMIN" ? "ADMIN" : "STAFF";
}

export function canViewAllTimeOffs(user: User): boolean {
  const label = getRoleLabel(user);
  return user.role === "ADMIN" || label === "HR" || label === "BODS";
}

export function formatTimeOffSession(s: TimeOffSession): string {
  const map: Record<TimeOffSession, string> = {
    MORNING: "Sáng",
    AFTERNOON: "Chiều",
    FULL: "Cả ngày",
  };
  return map[s] ?? s;
}

export function formatTimeOffReason(r: TimeOffReason): string {
  const map: Record<TimeOffReason, string> = {
    ANNUAL_LEAVE: "Nghỉ phép",
    WFH: "Work from home",
    LATE_ARRIVAL: "Xin đi trễ",
    EARLY_LEAVE: "Xin về sớm",
    BUSINESS_TRIP: "Công tác",
    OTHER: "Khác",
  };
  return map[r] ?? r;
}

export function formatStatus(s: TimeOffStatus): string {
  const map: Record<TimeOffStatus, string> = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
  };
  return map[s] ?? s;
}
