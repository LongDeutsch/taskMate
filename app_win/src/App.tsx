import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelTimeOff,
  clearSession,
  createTimeOff,
  getAllTimeOffs,
  getMyTimeOffs,
  getStoredUser,
  getTimeOffRecipients,
  login,
  setApiBaseUrl,
  setTimeOffStatus,
  wakeApi,
} from "./api/client";
import {
  getDesktopConfig,
  isElectron,
  sendDesktopMail,
  setDesktopConfig,
} from "./lib/desktop";
import { filterTimeOffByCreatedDate } from "./lib/filterByCreatedDate";
import { buildTimeOffEmailContent } from "./lib/timeOffEmail";
import type {
  BusinessTripScheduleItem,
  TimeOffReason,
  TimeOffRequest,
  TimeOffSession,
  User,
} from "./types";
import {
  canViewAllTimeOffs,
  formatStatus,
  formatTimeOffReason,
  formatTimeOffSession,
  getRoleLabel,
} from "./types";

type Tab = "create" | "mine" | "all" | "settings";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyScheduleRow(): BusinessTripScheduleItem {
  const d = todayIso();
  return { startDate: d, endDate: d, staff: "", location: "", description: "" };
}

function RequestCard({
  req,
  showOwner,
  canDecide,
  canDelete,
  onDelete,
  onDecide,
}: {
  req: TimeOffRequest;
  showOwner?: boolean;
  canDelete?: boolean;
  canDecide?: boolean;
  onDelete?: () => void;
  onDecide?: (status: "approved" | "rejected") => void;
}) {
  const badgeClass =
    req.status === "approved"
      ? "badge-approved"
      : req.status === "rejected"
        ? "badge-rejected"
        : "badge-pending";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h3>
          {formatTimeOffReason(req.reason)} · {req.startDate}
          {req.endDate !== req.startDate ? ` → ${req.endDate}` : ""}
        </h3>
        <span className={`badge ${badgeClass}`}>{formatStatus(req.status)}</span>
      </div>
      {showOwner && <p className="muted">{req.userName}</p>}
      <p className="muted">
        Buổi: {formatTimeOffSession(req.session)} · Tạo:{" "}
        {new Date(req.createdAt).toLocaleString("vi-VN")}
      </p>
      {req.details && <p>{req.details}</p>}
      {req.recipients && req.recipients.length > 0 && (
        <p className="muted">
          HR: {req.recipients.map((r) => r.fullName).join(", ")}
        </p>
      )}
      {canDelete && onDelete && (
        <div className="actions">
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            Xóa
          </button>
        </div>
      )}
      {canDecide && req.status === "pending" && onDecide && (
        <div className="actions">
          <button type="button" className="btn btn-success" onClick={() => onDecide("approved")}>
            Duyệt
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onDecide("rejected")}>
            Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [tab, setTab] = useState<Tab>("create");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [apiUrl, setApiUrl] = useState("https://taskmate-be.onrender.com");
  const [webmailEmail, setWebmailEmail] = useState("");
  const [webmailPassword, setWebmailPassword] = useState("");
  const [hasWebmailPassword, setHasWebmailPassword] = useState(false);

  const [recipients, setRecipients] = useState<Awaited<ReturnType<typeof getTimeOffRecipients>>>([]);
  const [myRequests, setMyRequests] = useState<TimeOffRequest[]>([]);
  const [allRequests, setAllRequests] = useState<TimeOffRequest[]>([]);
  const [listCreatedFrom, setListCreatedFrom] = useState("");
  const [listCreatedTo, setListCreatedTo] = useState("");

  const [form, setForm] = useState({
    startDate: todayIso(),
    endDate: todayIso(),
    session: "FULL" as TimeOffSession,
    reason: "ANNUAL_LEAVE" as TimeOffReason,
    reasonOther: "",
    details: "",
    businessTripSchedule: [] as BusinessTripScheduleItem[],
    selectedRecipientIds: [] as string[],
  });

  const canViewAll = user ? canViewAllTimeOffs(user) : false;

  const filteredMine = useMemo(
    () => filterTimeOffByCreatedDate(myRequests, listCreatedFrom, listCreatedTo),
    [myRequests, listCreatedFrom, listCreatedTo]
  );

  const filteredAll = useMemo(
    () => filterTimeOffByCreatedDate(allRequests, listCreatedFrom, listCreatedTo),
    [allRequests, listCreatedFrom, listCreatedTo]
  );
  const selectedRecipients = useMemo(
    () => recipients.filter((r) => form.selectedRecipientIds.includes(r.id)),
    [recipients, form.selectedRecipientIds]
  );
  const hrRecipientIds = useMemo(
    () => selectedRecipients.map((r) => r.id),
    [selectedRecipients]
  );
  const hrEmails = useMemo(
    () => selectedRecipients.map((r) => r.email).filter((e): e is string => Boolean(e)),
    [selectedRecipients]
  );

  useEffect(() => {
    if (recipients.length === 0) return;
    setForm((f) => {
      const valid = new Set(recipients.map((r) => r.id));
      const kept = f.selectedRecipientIds.filter((id) => valid.has(id));
      if (kept.length > 0) return f;
      return { ...f, selectedRecipientIds: recipients.map((r) => r.id) };
    });
  }, [recipients]);

  const loadConfig = useCallback(async () => {
    const cfg = await getDesktopConfig();
    setApiUrl(cfg.apiUrl);
    setWebmailEmail(cfg.webmailEmail);
    setHasWebmailPassword(cfg.hasWebmailPassword);
    setApiBaseUrl(cfg.apiUrl);
  }, []);

  const refreshLists = useCallback(async () => {
    if (!user) return;
    const [mine, all, rec] = await Promise.all([
      getMyTimeOffs(),
      canViewAllTimeOffs(user) ? getAllTimeOffs() : Promise.resolve([]),
      getTimeOffRecipients(),
    ]);
    setMyRequests(mine);
    setAllRequests(all);
    setRecipients(rec);
  }, [user]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (user) void refreshLists().catch((e) => setError(String(e)));
  }, [user, refreshLists]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await setDesktopConfig({ apiUrl });
      setApiBaseUrl(apiUrl);
      await wakeApi();
      const u = await login(loginForm.username.trim(), loginForm.password);
      setUser(u);
      setSuccess(`Đăng nhập thành công — ${u.fullName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setTab("create");
    setSuccess(null);
    setError(null);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await setDesktopConfig({
        apiUrl,
        webmailEmail,
        webmailPassword: webmailPassword || undefined,
      });
      setApiBaseUrl(apiUrl);
      if (webmailPassword) setHasWebmailPassword(true);
      setWebmailPassword("");
      setSuccess("Đã lưu cài đặt");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!webmailEmail || !hasWebmailPassword) {
        throw new Error("Cấu hình email và mật khẩu webmail trong Cài đặt");
      }
      if (recipients.length === 0) {
        throw new Error("Chưa có HR active trên TaskMate");
      }
      if (hrRecipientIds.length === 0) {
        throw new Error("Chọn ít nhất một người nhận HR");
      }
      const missingEmail = selectedRecipients.filter((r) => !r.email);
      if (missingEmail.length > 0) {
        throw new Error(
          `HR chưa có email: ${missingEmail.map((r) => r.fullName).join(", ")}`
        );
      }
      if (form.reason === "OTHER" && !form.reasonOther.trim()) {
        throw new Error('Lý do "Khác" cần nhập nội dung');
      }
      if (form.reason === "BUSINESS_TRIP") {
        if (form.businessTripSchedule.length === 0) {
          throw new Error("Công tác cần ít nhất 1 dòng lịch trình");
        }
        for (const row of form.businessTripSchedule) {
          if (!row.staff.trim() || !row.location.trim() || !row.description.trim()) {
            throw new Error("Mỗi dòng lịch công tác cần đủ nhân sự, địa điểm, nội dung");
          }
        }
      }

      await wakeApi();

      const emailPayload = {
        userName: user.fullName,
        startDate: form.startDate,
        endDate: form.endDate,
        session: form.session,
        reason: form.reason,
        reasonOther: form.reasonOther,
        details: form.details,
        businessTripSchedule:
          form.reason === "BUSINESS_TRIP" ? form.businessTripSchedule : undefined,
      };
      const { subject, text, html } = buildTimeOffEmailContent(emailPayload);

      const mailResult = await sendDesktopMail({
        to: hrEmails,
        subject,
        text,
        html,
      });

      let created;
      try {
        created = await createTimeOff({
          startDate: form.startDate,
          endDate: form.endDate,
          session: form.session,
          reason: form.reason,
          reasonOther: form.reason === "OTHER" ? form.reasonOther.trim() : undefined,
          details: form.reason === "BUSINESS_TRIP" ? undefined : form.details.trim() || undefined,
          businessTripSchedule:
            form.reason === "BUSINESS_TRIP" ? form.businessTripSchedule : undefined,
          recipientIds: hrRecipientIds,
          skipMail: true,
        });
      } catch (apiErr) {
        const apiMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
        throw new Error(
          `Mail đã gửi tới ${mailResult.sent.join(", ")} nhưng đồng bộ TaskMate thất bại: ${apiMsg}`
        );
      }

      setSuccess(
        `Đã gửi mail tới ${mailResult.sent.join(", ")} và đồng bộ TaskMate (#${created.id}).`
      );
      setForm({
        startDate: todayIso(),
        endDate: todayIso(),
        session: "FULL",
        reason: "ANNUAL_LEAVE",
        reasonOther: "",
        details: "",
        businessTripSchedule: [],
        selectedRecipientIds: recipients.map((r) => r.id),
      });
      await refreshLists();
      setTab("mine");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="app-shell">
        <div className="login-box card">
          <h2>TaskMate Xin off</h2>
          <p className="muted">Đăng nhập TaskMate để gửi mail local và đồng bộ yêu cầu.</p>
          {!isElectron() && (
            <div className="alert alert-error">
              Bạn đang mở trên trình duyệt. Chạy{" "}
              <code>cd app_win && npm run dev</code> và dùng cửa sổ Electron (không mở trình duyệt).
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>URL TaskMate API</label>
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://taskmate-be.onrender.com"
              />
            </div>
            <div className="field">
              <label>Username</label>
              <input
                value={loginForm.username}
                onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label>Mật khẩu TaskMate</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !isElectron()}>
              {loading ? "Đang kết nối..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>TaskMate Xin off</h1>
          <div className="user-meta">
            {user.fullName} · {getRoleLabel(user)} · mail: {webmailEmail || "chưa cấu hình"}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => setTab("settings")}>
            Cài đặt
          </button>
          <button type="button" className="btn" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="app-body">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {tab !== "settings" && (
          <div className="tabs">
            <button
              type="button"
              className={`tab ${tab === "create" ? "active" : ""}`}
              onClick={() => {
                setTab("create");
                setError(null);
                setSuccess(null);
              }}
            >
              Tạo yêu cầu
            </button>
            <button
              type="button"
              className={`tab ${tab === "mine" ? "active" : ""}`}
              onClick={() => setTab("mine")}
            >
              Yêu cầu của tôi ({myRequests.length})
            </button>
            {canViewAll && (
              <button
                type="button"
                className={`tab ${tab === "all" ? "active" : ""}`}
                onClick={() => setTab("all")}
              >
                Tất cả ({allRequests.length})
              </button>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="card">
            <h3>Cài đặt</h3>
            <form onSubmit={handleSaveSettings}>
              <div className="field">
                <label>URL TaskMate API</label>
                <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
              </div>
              <div className="field">
                <label>Tài khoản email (gửi SMTP local)</label>
                <input
                  type="email"
                  value={webmailEmail}
                  onChange={(e) => setWebmailEmail(e.target.value)}
                  placeholder="long.nguyen@cybertech.com.vn"
                />
              </div>
              <div className="field">
                <label>Mật khẩu webmail</label>
                <input
                  type="password"
                  value={webmailPassword}
                  onChange={(e) => setWebmailPassword(e.target.value)}
                  placeholder={hasWebmailPassword ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
                />
                <p className="muted">Lưu an toàn trên Windows (DPAPI). SMTP: mail.cybertech.com.vn:465</p>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Lưu
              </button>
              <button type="button" className="btn" onClick={() => setTab("create")} style={{ marginLeft: 8 }}>
                Quay lại
              </button>
            </form>
          </div>
        )}

        {tab === "create" && (
          <form onSubmit={handleSubmitRequest} className="card">
            <h3>Tạo yêu cầu xin off</h3>
            <p className="muted">
              Gửi mail từ Windows → đồng bộ lên TaskMate (BE không gửi SMTP).
            </p>

            <div className="field-row">
              <div className="field">
                <label>Ngày bắt đầu</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>Ngày kết thúc</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Buổi nghỉ</label>
              <div className="chip-group">
                {(["MORNING", "AFTERNOON", "FULL"] as TimeOffSession[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${form.session === s ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, session: s }))}
                  >
                    {formatTimeOffSession(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Lý do</label>
              <div className="chip-group">
                {(
                  [
                    "ANNUAL_LEAVE",
                    "WFH",
                    "LATE_ARRIVAL",
                    "EARLY_LEAVE",
                    "BUSINESS_TRIP",
                    "OTHER",
                  ] as TimeOffReason[]
                ).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`chip ${form.reason === r ? "active" : ""}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        reason: r,
                        businessTripSchedule:
                          r === "BUSINESS_TRIP" && f.businessTripSchedule.length === 0
                            ? [emptyScheduleRow()]
                            : f.businessTripSchedule,
                      }))
                    }
                  >
                    {formatTimeOffReason(r)}
                  </button>
                ))}
              </div>
            </div>

            {form.reason !== "BUSINESS_TRIP" && (
              <div className="field">
                <label>Thông tin thêm</label>
                <textarea
                  rows={3}
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                />
              </div>
            )}

            {form.reason === "OTHER" && (
              <div className="field">
                <label>Mô tả lý do</label>
                <textarea
                  rows={2}
                  value={form.reasonOther}
                  onChange={(e) => setForm((f) => ({ ...f, reasonOther: e.target.value }))}
                />
              </div>
            )}

            {form.reason === "BUSINESS_TRIP" &&
              form.businessTripSchedule.map((row, idx) => (
                <div key={idx} className="schedule-row">
                  <div className="field-row">
                    <div className="field">
                      <label>Từ ngày</label>
                      <input
                        type="date"
                        value={row.startDate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            businessTripSchedule: f.businessTripSchedule.map((r, i) =>
                              i === idx ? { ...r, startDate: e.target.value } : r
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Đến ngày</label>
                      <input
                        type="date"
                        value={row.endDate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            businessTripSchedule: f.businessTripSchedule.map((r, i) =>
                              i === idx ? { ...r, endDate: e.target.value } : r
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Nhân sự</label>
                    <input
                      value={row.staff}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          businessTripSchedule: f.businessTripSchedule.map((r, i) =>
                            i === idx ? { ...r, staff: e.target.value } : r
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Địa điểm</label>
                    <input
                      value={row.location}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          businessTripSchedule: f.businessTripSchedule.map((r, i) =>
                            i === idx ? { ...r, location: e.target.value } : r
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Nội dung</label>
                    <textarea
                      rows={2}
                      value={row.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          businessTripSchedule: f.businessTripSchedule.map((r, i) =>
                            i === idx ? { ...r, description: e.target.value } : r
                          ),
                        }))
                      }
                    />
                  </div>
                  {form.businessTripSchedule.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          businessTripSchedule: f.businessTripSchedule.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      Xoá dòng
                    </button>
                  )}
                </div>
              ))}

            {form.reason === "BUSINESS_TRIP" && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    businessTripSchedule: [...f.businessTripSchedule, emptyScheduleRow()],
                  }))
                }
              >
                + Thêm dòng lịch trình
              </button>
            )}

            <div className="field" style={{ marginTop: 16 }}>
              <label>Người nhận HR</label>
              <p className="muted" style={{ marginTop: 0 }}>
                Chọn HR sẽ nhận email và thông báo yêu cầu.
              </p>
              {recipients.length === 0 ? (
                <p className="muted">Chưa có HR trên TaskMate</p>
              ) : (
                <div className="hr-list">
                  {recipients.map((r) => {
                    const checked = form.selectedRecipientIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`hr-item hr-item-selectable ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((f) => {
                              const next = checked
                                ? f.selectedRecipientIds.filter((id) => id !== r.id)
                                : [...f.selectedRecipientIds, r.id];
                              return { ...f, selectedRecipientIds: next };
                            })
                          }
                        />
                        <span className="hr-item-body">
                          <span className="hr-item-name">{r.fullName}</span>
                          <span className="hr-item-meta muted">
                            {r.email ?? "chưa có email"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedRecipients.length > 0 && (
                <p className="muted">
                  Sẽ gửi tới: {selectedRecipients.map((r) => r.fullName).join(", ")}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi mail & đồng bộ TaskMate"}
            </button>
          </form>
        )}

        {(tab === "mine" || tab === "all") && (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Lọc theo ngày tạo</h3>
            <div className="field-row">
              <div className="field">
                <label htmlFor="app-created-from">Từ ngày</label>
                <input
                  id="app-created-from"
                  type="date"
                  value={listCreatedFrom}
                  onChange={(e) => setListCreatedFrom(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="app-created-to">Đến ngày</label>
                <input
                  id="app-created-to"
                  type="date"
                  value={listCreatedTo}
                  onChange={(e) => setListCreatedTo(e.target.value)}
                />
              </div>
            </div>
            {(listCreatedFrom || listCreatedTo) && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setListCreatedFrom("");
                  setListCreatedTo("");
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {tab === "mine" && (
          <div>
            {filteredMine.length === 0 ? (
              <p className="muted">Chưa có yêu cầu trong khoảng ngày đã chọn.</p>
            ) : (
              filteredMine.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  canDelete={req.userId === user?.id}
                  onDelete={async () => {
                    if (!confirm("Xóa yêu cầu này?")) return;
                    await cancelTimeOff(req.id);
                    await refreshLists();
                  }}
                />
              ))
            )}
          </div>
        )}

        {tab === "all" && canViewAll && (
          <div>
            {filteredAll.length === 0 ? (
              <p className="muted">Chưa có yêu cầu trong khoảng ngày đã chọn.</p>
            ) : (
              filteredAll.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  showOwner
                  canDelete={req.userId === user?.id}
                  canDecide
                  onDelete={async () => {
                    if (!confirm("Xóa yêu cầu này?")) return;
                    await cancelTimeOff(req.id);
                    await refreshLists();
                  }}
                  onDecide={async (status) => {
                    await setTimeOffStatus(req.id, status);
                    await refreshLists();
                  }}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
