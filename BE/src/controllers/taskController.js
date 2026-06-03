import crypto from "crypto";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { createNotFoundError, createForbiddenError, createBadRequestError } from "../utils/errors.js";
import { createNotification } from "./notificationController.js";
import { checkTaskDeadline } from "../services/automationService.js";

/** Cửa sổ hoàn tác sau khi gửi phản hồi (giây). FE hiện toast 6s + buffer. */
const RESPONSE_UNDO_WINDOW_MS = 30 * 1000;

/** Lấy danh sách _id của tất cả admin đang hoạt động, trừ actor hiện tại. */
async function getAdminRecipients(excludeUserId) {
  const admins = await User.find({
    role: "ADMIN",
    deletedAt: null,
    disabled: false,
  })
    .select("_id")
    .lean();
  return admins.map((a) => a._id).filter((id) => id !== excludeUserId);
}

async function notifyTaskRecipients({ task, recipients, actor, type, changeSummary }) {
  const ids = [...new Set((recipients || []).filter((id) => typeof id === "string" && id && id !== actor?.id))];
  if (ids.length === 0) return;
  await Promise.all(
    ids.map((userId) =>
      createNotification({
        userId,
        type,
        taskId: task._id ?? task.id,
        taskTitle: task.title ?? "",
        actorId: actor?.id ?? null,
        actorName: actor?.fullName ?? actor?.username ?? "",
        changeSummary: changeSummary ?? "",
      })
    )
  );
}

/** Tính tóm tắt thay đổi giữa before và after cho các trường người dùng quan tâm. */
function buildTaskChangeSummary(before, after) {
  const shortFields = [
    { key: "title", label: "title" },
    { key: "status", label: "status" },
    { key: "priority", label: "priority" },
    { key: "deadline", label: "deadline" },
  ];
  const parts = [];
  for (const { key, label } of shortFields) {
    const a = before?.[key] ?? null;
    const b = after?.[key] ?? null;
    if (a !== b) {
      const fmt = (v) => (v == null || v === "" ? "(empty)" : String(v));
      parts.push(`${label}: ${fmt(a)} → ${fmt(b)}`);
    }
  }
  // feedback là text dài nên không in nguyên nội dung — chỉ báo trạng thái thay đổi.
  const beforeFeedback = String(before?.feedback ?? "").trim();
  const afterFeedback = String(after?.feedback ?? "").trim();
  if (beforeFeedback !== afterFeedback) {
    if (beforeFeedback === "" && afterFeedback !== "") {
      parts.push("feedback: thêm mới");
    } else if (beforeFeedback !== "" && afterFeedback === "") {
      parts.push("feedback: đã xoá");
    } else {
      parts.push("feedback: đã cập nhật");
    }
  }
  return parts.join(", ");
}

const TRASH_RETENTION_DAYS = 5;

function newTaskId() {
  return "t-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function restoreDeadlineFrom(now = new Date()) {
  return new Date(now.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function purgeExpiredDeletedTasks() {
  await Task.deleteMany({
    deletedAt: { $ne: null },
    restoreUntil: { $ne: null, $lt: new Date() },
  });
}

async function promotePrioritiesWhenHighCompleted(assigneeId) {
  if (!assigneeId) return;
  const remainingHighTodo = await Task.countDocuments({
    deletedAt: null,
    assigneeId,
    priority: "High",
    status: { $ne: "Done" },
  });
  if (remainingHighTodo > 0) return;

  // Chỉ nâng các task chưa done để tránh làm sai lịch sử.
  await Task.updateMany(
    { deletedAt: null, assigneeId, status: { $ne: "Done" }, priority: "Medium" },
    { $set: { priority: "High", updatedAt: new Date() } }
  );
  await Task.updateMany(
    { deletedAt: null, assigneeId, status: { $ne: "Done" }, priority: "Low" },
    { $set: { priority: "Medium", updatedAt: new Date() } }
  );
}

async function buildProjectNameMap(tasks) {
  const ids = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const projects = await Project.find({ _id: { $in: ids }, deletedAt: null }).select("_id name").lean();
  return new Map(projects.map((p) => [p._id, p.name]));
}

/** Resolve assignee + collaborator ids to display names (USER role cannot call GET /users). */
async function buildUserMap(userIds) {
  const ids = [...new Set(userIds.filter((x) => typeof x === "string" && x.length > 0))];
  if (ids.length === 0) return new Map();
  const users = await User.find({ _id: { $in: ids }, deletedAt: null })
    .select("_id fullName username")
    .lean();
  return new Map(
    users.map((u) => [
      u._id,
      {
        id: u._id,
        fullName: u.fullName || u.username,
        username: u.username,
      },
    ])
  );
}

function enrichTaskPeople(t, userMap) {
  const assigneeName =
    t.assigneeId == null || t.assigneeId === ""
      ? null
      : userMap.get(t.assigneeId)?.fullName ?? t.assigneeId;
  const collaborators = (t.collaboratorIds || []).map((cid) => {
    const u = userMap.get(cid);
    return u ?? { id: cid, fullName: cid, username: "" };
  });
  return { assigneeName, collaborators };
}

async function normalizeCollaboratorIds({ assigneeId, collaboratorIds }) {
  const ids = Array.isArray(collaboratorIds)
    ? [...new Set(collaboratorIds.filter((v) => typeof v === "string" && v.trim() !== ""))]
    : [];
  if (ids.length === 0) return [];

  const normalized = ids.filter((id) => id !== assigneeId);
  if (normalized.length === 0) return [];

  const validUsers = await User.find({
    _id: { $in: normalized },
    deletedAt: null,
    disabled: false,
    role: "USER",
    roleLabel: { $ne: "HR" },
  })
    .select("_id")
    .lean();
  const validIds = new Set(validUsers.map((u) => u._id));
  const invalid = normalized.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw createBadRequestError("Collaborators phải là user đang hoạt động và không phải HR");
  }
  return normalized;
}

/**
 * Đảm bảo assignee hợp lệ:
 *  - Không HR, không bị xoá/disabled.
 *  - Cho phép USER role bình thường.
 *  - Cho phép ADMIN role NẾU đó là chính actor (admin tự note cho mình).
 */
async function assertAssignableUser(assigneeId, actorId) {
  if (!assigneeId) return;
  // Self-note của admin: chỉ check active.
  if (actorId && assigneeId === actorId) {
    const self = await User.findOne({
      _id: assigneeId,
      deletedAt: null,
      disabled: false,
      roleLabel: { $ne: "HR" },
    })
      .select("_id")
      .lean();
    if (self) return;
  }
  const u = await User.findOne({
    _id: assigneeId,
    deletedAt: null,
    disabled: false,
    role: "USER",
    roleLabel: { $ne: "HR" },
  })
    .select("_id")
    .lean();
  if (!u) {
    throw createBadRequestError(
      "Assignee phải là user đang hoạt động và không phải HR (admin chỉ có thể tự note cho chính mình)"
    );
  }
}

export async function list(req, res, next) {
  try {
    await purgeExpiredDeletedTasks();
    const { projectId, assigneeId, status, priority } = req.query;
    const filter = { deletedAt: null };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (req.user.role !== "ADMIN") {
      filter.$or = [{ assigneeId: req.user.id }, { collaboratorIds: req.user.id }];
    } else if (assigneeId) {
      filter.assigneeId = assigneeId;
    }
    const sort = { deadline: 1, createdAt: -1 };
    const tasks = await Task.find(filter).sort(sort).lean();
    const projectNameMap = await buildProjectNameMap(tasks);
    const allUserIds = tasks.flatMap((t) => [
      t.assigneeId,
      ...((Array.isArray(t.collaboratorIds) && t.collaboratorIds) || []),
    ]);
    const userMap = await buildUserMap(allUserIds);
    const result = tasks
      // Self-note (projectId null) luôn được giữ; task có project chỉ giữ khi project chưa bị xoá.
      .filter((t) => !t.projectId || projectNameMap.has(t.projectId))
      .map((t) => {
        const { assigneeName, collaborators } = enrichTaskPeople(t, userMap);
        return {
          ...serializeTask(t),
          projectName: t.projectId ? projectNameMap.get(t.projectId) ?? null : null,
          assigneeName,
          collaborators,
        };
      });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const task = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!task) {
      return next(createNotFoundError("Task not found"));
    }
    const isTaskMember =
      task.assigneeId === req.user.id ||
      ((Array.isArray(task.collaboratorIds) && task.collaboratorIds.includes(req.user.id)) || false);
    if (req.user.role !== "ADMIN" && !isTaskMember) {
      return next(createForbiddenError("You can only view tasks assigned to you or where you are collaborator"));
    }
    // Self-note (admin tự note) có thể không gắn project — chấp nhận projectId null.
    let project = null;
    if (task.projectId) {
      project = await Project.findOne({ _id: task.projectId, deletedAt: null })
        .select("name")
        .lean();
      if (!project) {
        return next(createNotFoundError("Project for this task not found"));
      }
    }
    const userMap = await buildUserMap([
      task.assigneeId,
      ...((Array.isArray(task.collaboratorIds) && task.collaboratorIds) || []),
    ]);
    const { assigneeName, collaborators } = enrichTaskPeople(task, userMap);
    res.json({
      success: true,
      data: {
        ...serializeTask(task),
        projectName: project?.name ?? null,
        assigneeName,
        collaborators,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const {
      projectId,
      title,
      description,
      feedback,
      status,
      priority,
      deadline,
      assigneeId,
      collaboratorIds,
    } = req.body;
    await assertAssignableUser(assigneeId, req.user?.id);
    const normalizedCollaborators = await normalizeCollaboratorIds({
      assigneeId: assigneeId || null,
      collaboratorIds,
    });

    // Self-note của admin được phép không gắn project; các task thường vẫn yêu cầu project.
    const isSelfNote = !!assigneeId && assigneeId === req.user?.id && req.user?.role === "ADMIN";
    const normalizedProjectId = projectId && String(projectId).trim() !== "" ? projectId : null;
    if (!isSelfNote && !normalizedProjectId) {
      return next(createBadRequestError("projectId is required"));
    }

    const id = newTaskId();
    const task = await Task.create({
      _id: id,
      projectId: normalizedProjectId,
      title: title || "Untitled",
      description: description || "",
      feedback: typeof feedback === "string" ? feedback : "",
      status: status || "Todo",
      priority: priority || "Medium",
      deadline: deadline || new Date().toISOString().slice(0, 10),
      assigneeId: assigneeId || null,
      collaboratorIds: normalizedCollaborators,
    });
    const doc = task.toJSON();

    // Best-effort: thông báo assignee và collaborators (không chặn response).
    notifyTaskRecipients({
      task: doc,
      recipients: doc.assigneeId ? [doc.assigneeId] : [],
      actor: req.user,
      type: "task_assigned",
    }).catch(() => {});
    notifyTaskRecipients({
      task: doc,
      recipients: (doc.collaboratorIds || []).filter((id) => id !== doc.assigneeId),
      actor: req.user,
      type: "task_collaborator",
    }).catch(() => {});

    // Bắn deadline_reminder/overdue_alert ngay nếu task vừa tạo đã sát/quá hạn.
    checkTaskDeadline(doc).catch(() => {});

    res.status(201).json({
      success: true,
      data: { ...doc, id: doc._id },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const before = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!before) {
      return next(createNotFoundError("Task not found"));
    }

    const hasCollaborators = Object.prototype.hasOwnProperty.call(req.body, "collaboratorIds");
    const targetAssigneeId = req.body.assigneeId ?? before.assigneeId;
    if (
      Object.prototype.hasOwnProperty.call(req.body, "assigneeId") &&
      targetAssigneeId &&
      targetAssigneeId !== before.assigneeId
    ) {
      await assertAssignableUser(targetAssigneeId, req.user?.id);
    }
    const collaboratorSource = hasCollaborators
      ? req.body.collaboratorIds ?? []
      : before.collaboratorIds ?? [];
    const normalizedCollaborators = await normalizeCollaboratorIds({
      assigneeId: targetAssigneeId || null,
      collaboratorIds: collaboratorSource,
    });

    // Track xem PM có đụng vào feedback không, để cập nhật feedbackUpdatedAt
    // (mốc dùng so sánh với userResponseSentAt trong flow phản hồi của user)
    // và push entry vào feedbackHistory (user xem được).
    const feedbackChanged =
      Object.prototype.hasOwnProperty.call(req.body, "feedback") &&
      String(req.body.feedback ?? "") !== String(before.feedback ?? "");

    const $set = {
      ...req.body,
      collaboratorIds: normalizedCollaborators,
      updatedAt: new Date(),
    };
    const $push = {};
    if (feedbackChanged) {
      $set.feedbackUpdatedAt = new Date();
      const newContent = String(req.body.feedback ?? "");
      // Chỉ ghi lịch sử khi nội dung mới khác rỗng (xoá feedback không tạo entry).
      if (newContent.trim() !== "") {
        const hadHistory = (before.feedbackHistory || []).length > 0;
        $push.feedbackHistory = {
          content: newContent,
          kind: hadHistory ? "edit" : "sent",
          createdAt: new Date(),
          authorId: req.user?.id ?? "",
          authorName: req.user?.fullName ?? req.user?.username ?? "",
        };
      }
    }

    const updateOps = { $set };
    if (Object.keys($push).length > 0) updateOps.$push = $push;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateOps,
      { new: true, runValidators: true }
    ).lean();
    if (!task) {
      return next(createNotFoundError("Task not found"));
    }

    // Notify khi assignee mới được gán (khác before.assigneeId, khác null, khác actor).
    if (task.assigneeId && task.assigneeId !== before.assigneeId) {
      notifyTaskRecipients({
        task,
        recipients: [task.assigneeId],
        actor: req.user,
        type: before.assigneeId ? "task_reassigned" : "task_assigned",
      }).catch(() => {});
    }

    // Notify cho collaborators MỚI được thêm vào (so với before).
    const beforeCollabs = new Set(before.collaboratorIds || []);
    const newCollabs = (task.collaboratorIds || []).filter(
      (id) => !beforeCollabs.has(id) && id !== task.assigneeId
    );
    if (newCollabs.length > 0) {
      notifyTaskRecipients({
        task,
        recipients: newCollabs,
        actor: req.user,
        type: "task_collaborator",
      }).catch(() => {});
    }

    // Notify khi các trường quan trọng (title/status/priority/deadline) thay đổi.
    // Người nhận: assignee + collaborators HIỆN TẠI, trừ những người vừa được "thêm
    // mới" ở trên (vì họ đã nhận thông báo task_assigned/task_collaborator riêng).
    const changeSummary = buildTaskChangeSummary(before, task);
    if (changeSummary) {
      const newlyNotified = new Set([
        ...(task.assigneeId && task.assigneeId !== before.assigneeId ? [task.assigneeId] : []),
        ...newCollabs,
      ]);
      const updateRecipients = [
        ...(task.assigneeId ? [task.assigneeId] : []),
        ...(task.collaboratorIds || []),
      ].filter((id) => id && !newlyNotified.has(id));
      if (updateRecipients.length > 0) {
        notifyTaskRecipients({
          task,
          recipients: updateRecipients,
          actor: req.user,
          type: "task_updated",
          changeSummary,
        }).catch(() => {});
      }
    }

    // Automation rule:
    // Khi user hoàn tất toàn bộ task High (trigger ở lúc high-task vừa chuyển sang Done),
    // tự động nâng priority: Medium->High, Low->Medium cho các task còn mở của user đó.
    const justCompletedHighTask =
      before.priority === "High" &&
      before.status !== "Done" &&
      task.status === "Done" &&
      !!task.assigneeId;
    if (justCompletedHighTask) {
      await promotePrioritiesWhenHighCompleted(task.assigneeId);
    }

    // Re-evaluate deadline alerts cho task này (vd. khi PM dời deadline về tomorrow,
    // hoặc khi user mở lại task từ Done -> InProgress làm overdue).
    checkTaskDeadline(task).catch(() => {});

    res.json({ success: true, data: serializeTask(task) });
  } catch (err) {
    next(err);
  }
}

export async function deleteAll(req, res, next) {
  try {
    await purgeExpiredDeletedTasks();
    const now = new Date();
    const restoreUntil = restoreDeadlineFrom(now);
    const result = await Task.updateMany(
      { deletedAt: null },
      { $set: { deletedAt: now, restoreUntil, deletedByProject: false, updatedAt: now } }
    );
    res.json({
      success: true,
      data: { deletedCount: result.modifiedCount },
      message: "All tasks moved to trash",
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const task = await Task.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) {
      return next(createNotFoundError("Task not found"));
    }
    const now = new Date();
    task.deletedAt = now;
    task.restoreUntil = restoreDeadlineFrom(now);
    task.deletedByProject = false;
    task.updatedAt = now;
    await task.save();
    const doc = task.toJSON();
    res.status(200).json({ success: true, data: { ...doc, id: doc._id }, message: "Task moved to trash" });
  } catch (err) {
    next(err);
  }
}

export async function listTrash(req, res, next) {
  try {
    await purgeExpiredDeletedTasks();
    const tasks = await Task.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
    const result = tasks.map((t) => ({
      ...t,
      id: t._id,
      createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
      updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
      deletedAt: t.deletedAt?.toISOString?.() ?? t.deletedAt,
      restoreUntil: t.restoreUntil?.toISOString?.() ?? t.restoreUntil,
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function restoreFromTrash(req, res, next) {
  try {
    await purgeExpiredDeletedTasks();
    const task = await Task.findOne({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!task) {
      return next(createNotFoundError("Task not found in trash"));
    }
    task.deletedAt = null;
    task.restoreUntil = null;
    task.deletedByProject = false;
    task.updatedAt = new Date();
    await task.save();
    const doc = task.toJSON();
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}

/** Helper: chuẩn bị task lean ra JSON cùng định dạng các trường ngày. */
function serializeTask(task) {
  if (!task) return task;
  return {
    ...task,
    id: task._id,
    createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
    updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt,
    feedbackUpdatedAt: task.feedbackUpdatedAt?.toISOString?.() ?? task.feedbackUpdatedAt ?? null,
    userResponseSentAt:
      task.userResponseSentAt?.toISOString?.() ?? task.userResponseSentAt ?? null,
    userResponseHistory: Array.isArray(task.userResponseHistory)
      ? task.userResponseHistory.map((h) => ({
          ...h,
          id: h._id?.toString?.() ?? h.id,
          createdAt: h.createdAt?.toISOString?.() ?? h.createdAt,
        }))
      : [],
    feedbackHistory: Array.isArray(task.feedbackHistory)
      ? task.feedbackHistory.map((h) => ({
          ...h,
          id: h._id?.toString?.() ?? h.id,
          createdAt: h.createdAt?.toISOString?.() ?? h.createdAt,
        }))
      : [],
  };
}

/** Quyền: chỉ assignee hoặc collaborator của task mới được tự cập nhật. */
async function requireTaskMember(req) {
  const before = await Task.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!before) return { error: createNotFoundError("Task not found") };
  const userId = req.user.id;
  const isAssignee = before.assigneeId === userId;
  const isCollaborator = (before.collaboratorIds || []).includes(userId);
  if (!isAssignee && !isCollaborator) {
    return {
      error: createForbiddenError(
        "Bạn chỉ có thể cập nhật task được giao cho mình hoặc bạn là collaborator"
      ),
    };
  }
  return { before, userId };
}

/**
 * USER (assignee hoặc collaborator) cập nhật STATUS của task. Bắn notification
 * tới TẤT CẢ ADMIN. Phần phản hồi (userResponse) đi qua các endpoint riêng:
 * /response/draft, /response/send, /response/undo.
 */
export async function userUpdate(req, res, next) {
  try {
    const { error, before, userId } = await requireTaskMember(req);
    if (error) return next(error);

    if (!Object.prototype.hasOwnProperty.call(req.body, "status")) {
      return next(createBadRequestError("Không có gì để cập nhật"));
    }
    const s = req.body.status;
    if (!["Todo", "InProgress", "Done"].includes(s)) {
      return next(createBadRequestError("status không hợp lệ"));
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { status: s, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!task) return next(createNotFoundError("Task not found"));

    // Automation rule
    const justCompletedHighTask =
      before.priority === "High" &&
      before.status !== "Done" &&
      task.status === "Done" &&
      !!task.assigneeId;
    if (justCompletedHighTask) {
      await promotePrioritiesWhenHighCompleted(task.assigneeId);
    }

    if (s !== before.status) {
      const adminIds = await getAdminRecipients(userId);
      notifyTaskRecipients({
        task,
        recipients: adminIds,
        actor: req.user,
        type: "task_user_update",
        changeSummary: `status: ${before.status} → ${s}`,
      }).catch(() => {});
    }

    // Khi user reopen task (Done -> InProgress/Todo) trong khi deadline đã sát/quá,
    // bắn alert ngay (duplicate guard theo ngày sẽ không gửi trùng).
    checkTaskDeadline(task).catch(() => {});

    res.json({ success: true, data: serializeTask(task) });
  } catch (err) {
    next(err);
  }
}

/**
 * USER lưu bản nháp phản hồi (auto-save). Bản nháp KHÔNG hiển thị cho PM
 * và không tạo notification.
 */
export async function saveResponseDraft(req, res, next) {
  try {
    const { error } = await requireTaskMember(req);
    if (error) return next(error);
    const draft = req.body?.userResponseDraft;
    if (typeof draft !== "string") {
      return next(createBadRequestError("userResponseDraft phải là chuỗi"));
    }
    if (draft.length > 5000) {
      return next(createBadRequestError("userResponseDraft quá dài (tối đa 5000 ký tự)"));
    }
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { userResponseDraft: draft, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!task) return next(createNotFoundError("Task not found"));
    res.json({ success: true, data: serializeTask(task) });
  } catch (err) {
    next(err);
  }
}

/**
 * USER gửi phản hồi cho PM. Tự động xác định kind:
 * - "sent"   : lần đầu chưa từng có history
 * - "edit"   : đã có history nhưng PM chưa phản hồi mới (feedbackUpdatedAt
 *              <= userResponseSentAt)
 * - "append" : PM đã phản hồi sau lần gửi gần nhất
 *
 * Tạo entry trong userResponseHistory, set userResponse = content, clear draft,
 * cập nhật userResponseSentAt, và bắn notification cho ADMIN.
 */
export async function sendResponse(req, res, next) {
  try {
    const { error, before, userId } = await requireTaskMember(req);
    if (error) return next(error);
    const content = (req.body?.content ?? "").toString();
    if (!content.trim()) {
      return next(createBadRequestError("Nội dung phản hồi không được trống"));
    }
    if (content.length > 5000) {
      return next(createBadRequestError("Phản hồi quá dài (tối đa 5000 ký tự)"));
    }

    const hasHistory = (before.userResponseHistory || []).length > 0;
    const sentAt = before.userResponseSentAt
      ? new Date(before.userResponseSentAt).getTime()
      : 0;
    const fbAt = before.feedbackUpdatedAt
      ? new Date(before.feedbackUpdatedAt).getTime()
      : 0;
    const pmRespondedSince = hasHistory && fbAt > sentAt;
    const kind = !hasHistory ? "sent" : pmRespondedSince ? "append" : "edit";

    const now = new Date();
    const entry = {
      content,
      kind,
      createdAt: now,
      authorId: userId,
      authorName: req.user?.fullName ?? req.user?.username ?? "",
    };

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          userResponse: content,
          userResponseDraft: "",
          userResponseSentAt: now,
          updatedAt: now,
        },
        $push: { userResponseHistory: entry },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!task) return next(createNotFoundError("Task not found"));

    const summaryByKind = {
      sent: "phản hồi: gửi lần đầu",
      edit: "phản hồi: chỉnh sửa",
      append: "phản hồi: bổ sung sau khi PM trả lời",
    };
    const adminIds = await getAdminRecipients(userId);
    notifyTaskRecipients({
      task,
      recipients: adminIds,
      actor: req.user,
      type: "task_user_update",
      changeSummary: summaryByKind[kind],
    }).catch(() => {});

    const lastEntry = task.userResponseHistory?.[task.userResponseHistory.length - 1];
    res.json({
      success: true,
      data: serializeTask(task),
      undoToken: lastEntry?._id?.toString?.() ?? lastEntry?.id ?? null,
      kind,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * USER hoàn tác lần gửi gần nhất, trong cửa sổ undo (30s). Xoá entry
 * vừa thêm, khôi phục userResponse về entry trước đó (hoặc rỗng nếu không
 * có), khôi phục draft = nội dung vừa rút lại, và xoá các notification
 * task_user_update vừa tạo cho admin.
 */
export async function undoResponse(req, res, next) {
  try {
    const { error, before, userId } = await requireTaskMember(req);
    if (error) return next(error);
    const undoToken = (req.body?.undoToken ?? "").toString();
    if (!undoToken) {
      return next(createBadRequestError("Thiếu undoToken"));
    }

    const history = before.userResponseHistory || [];
    if (history.length === 0) {
      return next(createBadRequestError("Không có gì để hoàn tác"));
    }
    const last = history[history.length - 1];
    const lastId = last?._id?.toString?.() ?? last?.id;
    if (lastId !== undoToken) {
      return next(createBadRequestError("undoToken không khớp với entry mới nhất"));
    }
    if (last.authorId !== userId) {
      return next(createForbiddenError("Bạn không thể hoàn tác phản hồi của người khác"));
    }
    const ageMs = Date.now() - new Date(last.createdAt).getTime();
    if (ageMs > RESPONSE_UNDO_WINDOW_MS) {
      return next(createBadRequestError("Đã quá thời gian hoàn tác"));
    }

    const previous = history[history.length - 2] ?? null;
    const restoredResponse = previous ? previous.content : "";
    const restoredSentAt = previous ? previous.createdAt : null;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          userResponse: restoredResponse,
          userResponseDraft: last.content,
          userResponseSentAt: restoredSentAt,
          updatedAt: new Date(),
        },
        $pop: { userResponseHistory: 1 },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!task) return next(createNotFoundError("Task not found"));

    // Xoá notification task_user_update vừa tạo trong khoảng undo window cho task này.
    Notification.deleteMany({
      taskId: req.params.id,
      type: "task_user_update",
      actorId: userId,
      createdAt: { $gte: new Date(Date.now() - RESPONSE_UNDO_WINDOW_MS - 1000) },
    }).catch(() => {});

    res.json({ success: true, data: serializeTask(task) });
  } catch (err) {
    next(err);
  }
}
