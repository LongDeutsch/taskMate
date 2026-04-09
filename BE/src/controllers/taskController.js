import crypto from "crypto";
import { Task } from "../models/Task.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { createNotFoundError, createForbiddenError, createBadRequestError } from "../utils/errors.js";
import { postTaskToSheets } from "../services/sheetsWebhook.js";

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

async function normalizeCollaboratorIds({ projectId, assigneeId, collaboratorIds }) {
  const ids = Array.isArray(collaboratorIds)
    ? [...new Set(collaboratorIds.filter((v) => typeof v === "string" && v.trim() !== ""))]
    : [];
  if (ids.length === 0) return [];

  const memberIds = await Task.distinct("assigneeId", {
    deletedAt: null,
    projectId,
    assigneeId: { $ne: null },
  });
  const allowed = new Set(memberIds.filter(Boolean));
  if (assigneeId) allowed.add(assigneeId);

  const normalized = ids.filter((id) => id !== assigneeId);
  const invalid = normalized.filter((id) => !allowed.has(id));
  if (invalid.length > 0) {
    throw createBadRequestError("Collaborators must belong to the same project");
  }
  return normalized;
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
      filter.assigneeId = req.user.id;
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
      .filter((t) => projectNameMap.has(t.projectId))
      .map((t) => {
        const { assigneeName, collaborators } = enrichTaskPeople(t, userMap);
        return {
          ...t,
          id: t._id,
          projectName: projectNameMap.get(t.projectId) ?? null,
          assigneeName,
          collaborators,
          createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
          updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
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
    if (req.user.role !== "ADMIN" && task.assigneeId !== req.user.id) {
      return next(createForbiddenError("You can only view your assigned tasks"));
    }
    const project = await Project.findOne({ _id: task.projectId, deletedAt: null }).select("name").lean();
    if (!project) {
      return next(createNotFoundError("Project for this task not found"));
    }
    const userMap = await buildUserMap([
      task.assigneeId,
      ...((Array.isArray(task.collaboratorIds) && task.collaboratorIds) || []),
    ]);
    const { assigneeName, collaborators } = enrichTaskPeople(task, userMap);
    res.json({
      success: true,
      data: {
        ...task,
        id: task._id,
        projectName: project.name,
        assigneeName,
        collaborators,
        createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
        updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt,
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
    const normalizedCollaborators = await normalizeCollaboratorIds({
      projectId,
      assigneeId: assigneeId || null,
      collaboratorIds,
    });
    const id = newTaskId();
    const task = await Task.create({
      _id: id,
      projectId,
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
    // Best-effort sync to Google Sheets (does not block success path).
    postTaskToSheets({ event: "create", task: { ...doc, id: doc._id }, actor: req.user }).catch(() => {});
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
    const targetProjectId = req.body.projectId ?? before.projectId;
    const targetAssigneeId = req.body.assigneeId ?? before.assigneeId;
    const collaboratorSource =
      hasCollaborators || req.body.projectId != null
        ? req.body.collaboratorIds ?? []
        : before.collaboratorIds ?? [];
    const normalizedCollaborators = await normalizeCollaboratorIds({
      projectId: targetProjectId,
      assigneeId: targetAssigneeId || null,
      collaboratorIds: collaboratorSource,
    });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, collaboratorIds: normalizedCollaborators, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!task) {
      return next(createNotFoundError("Task not found"));
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

    res.json({
      success: true,
      data: {
        ...task,
        id: task._id,
        createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
        updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt,
      },
    });
    // Best-effort sync to Google Sheets.
    postTaskToSheets({ event: "update", task: { ...task, id: task._id }, actor: req.user }).catch(() => {});
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
    // Best-effort sync to Google Sheets.
    postTaskToSheets({ event: "delete", task: { ...doc, id: doc._id }, actor: req.user }).catch(() => {});
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
    // Best-effort sync to Google Sheets.
    postTaskToSheets({ event: "restore", task: { ...doc, id: doc._id }, actor: req.user }).catch(() => {});
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}

export async function syncSheets(req, res, next) {
  try {
    // Admin-only route; sync all non-deleted tasks as "sync" events.
    const tasks = await Task.find({ deletedAt: null }).sort({ updatedAt: -1 }).lean();
    if (tasks.length === 0) {
      return res.json({ success: true, data: { total: 0, synced: 0, skipped: 0, failed: 0, errors: [] } });
    }

    const projectNameMap = await buildProjectNameMap(tasks);
    const allUserIds = tasks.flatMap((t) => [
      t.assigneeId,
      ...((Array.isArray(t.collaboratorIds) && t.collaboratorIds) || []),
    ]);
    const userMap = await buildUserMap(allUserIds);

    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];
    for (const t of tasks) {
      const { assigneeName, collaborators } = enrichTaskPeople(t, userMap);
      const payload = {
        ...t,
        id: t._id,
        projectName: projectNameMap.get(t.projectId) ?? null,
        assigneeName,
        collaborators,
        createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
        updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
      };
      const r = await postTaskToSheets({ event: "sync", task: payload, actor: req.user });
      if (r?.skipped) {
        skipped += 1;
        if (errors.length < 5) errors.push({ taskId: payload.id, type: "skipped", reason: r.reason });
        continue;
      }
      if (r?.ok) {
        synced += 1;
        continue;
      }
      failed += 1;
      if (errors.length < 5) {
        errors.push({
          taskId: payload.id,
          type: "failed",
          status: r?.status ?? null,
          redirected: r?.redirected ?? null,
          error: r?.error ?? null,
          body: typeof r?.body === "string" ? r.body.slice(0, 300) : null,
        });
      }
    }

    res.json({ success: true, data: { total: tasks.length, synced, skipped, failed, errors } });
  } catch (err) {
    next(err);
  }
}
