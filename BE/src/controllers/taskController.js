import crypto from "crypto";
import { Task } from "../models/Task.js";
import { createNotFoundError, createForbiddenError } from "../utils/errors.js";

function newTaskId() {
  return "t-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function list(req, res, next) {
  try {
    const { projectId, assigneeId, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (req.user.role !== "ADMIN") {
      filter.assigneeId = req.user.id;
    } else if (assigneeId) {
      filter.assigneeId = assigneeId;
    }
    const sort = { deadline: 1, createdAt: -1 };
    const tasks = await Task.find(filter).sort(sort).lean();
    const result = tasks.map((t) => ({
      ...t,
      id: t._id,
      createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
      updatedAt: t.updatedAt?.toISOString?.() ?? t.updatedAt,
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) {
      return next(createNotFoundError("Task not found"));
    }
    if (req.user.role !== "ADMIN" && task.assigneeId !== req.user.id) {
      return next(createForbiddenError("You can only view your assigned tasks"));
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
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { projectId, title, description, status, priority, deadline, assigneeId } = req.body;
    const id = newTaskId();
    const task = await Task.create({
      _id: id,
      projectId,
      title: title || "Untitled",
      description: description || "",
      status: status || "Todo",
      priority: priority || "Medium",
      deadline: deadline || new Date().toISOString().slice(0, 10),
      assigneeId: assigneeId || null,
    });
    const doc = task.toJSON();
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
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!task) {
      return next(createNotFoundError("Task not found"));
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
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return next(createNotFoundError("Task not found"));
    }
    res.status(200).json({ success: true, data: null, message: "Task deleted" });
  } catch (err) {
    next(err);
  }
}
