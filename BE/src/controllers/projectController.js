import crypto from "crypto";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { createNotFoundError } from "../utils/errors.js";

const TRASH_RETENTION_DAYS = 5;

function newId() {
  return "proj-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function restoreDeadlineFrom(now = new Date()) {
  return new Date(now.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function purgeExpiredDeletedProjects() {
  const expiredProjects = await Project.find({
    deletedAt: { $ne: null },
    restoreUntil: { $ne: null, $lt: new Date() },
  })
    .select("_id")
    .lean();
  if (expiredProjects.length === 0) return;
  const ids = expiredProjects.map((p) => p._id);
  await Project.deleteMany({ _id: { $in: ids } });
  await Task.deleteMany({ projectId: { $in: ids } });
}

export async function list(req, res, next) {
  try {
    await purgeExpiredDeletedProjects();
    const projects = await Project.find({ deletedAt: null }).sort({ updatedAt: -1 }).lean();
    const result = projects.map((p) => ({
      ...p,
      id: p._id,
      createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
      updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!project) {
      return next(createNotFoundError("Project not found"));
    }
    res.json({
      success: true,
      data: {
        ...project,
        id: project._id,
        createdAt: project.createdAt?.toISOString?.() ?? project.createdAt,
        updatedAt: project.updatedAt?.toISOString?.() ?? project.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    const id = newId();
    const project = await Project.create({
      _id: id,
      name: name || "New Project",
      description: description || "",
    });
    const doc = project.toJSON();
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
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!project) {
      return next(createNotFoundError("Project not found"));
    }
    res.json({
      success: true,
      data: {
        ...project,
        id: project._id,
        createdAt: project.createdAt?.toISOString?.() ?? project.createdAt,
        updatedAt: project.updatedAt?.toISOString?.() ?? project.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, deletedAt: null });
    if (!project) {
      return next(createNotFoundError("Project not found"));
    }
    const now = new Date();
    const restoreUntil = restoreDeadlineFrom(now);
    project.deletedAt = now;
    project.restoreUntil = restoreUntil;
    project.updatedAt = now;
    await project.save();
    await Task.updateMany(
      { projectId: req.params.id, deletedAt: null },
      { $set: { deletedAt: now, restoreUntil, deletedByProject: true, updatedAt: now } }
    );
    const doc = project.toJSON();
    res.status(200).json({ success: true, data: { ...doc, id: doc._id }, message: "Project moved to trash" });
  } catch (err) {
    next(err);
  }
}

export async function listTrash(req, res, next) {
  try {
    await purgeExpiredDeletedProjects();
    const projects = await Project.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
    const result = projects.map((p) => ({
      ...p,
      id: p._id,
      createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
      updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
      deletedAt: p.deletedAt?.toISOString?.() ?? p.deletedAt,
      restoreUntil: p.restoreUntil?.toISOString?.() ?? p.restoreUntil,
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function restoreFromTrash(req, res, next) {
  try {
    await purgeExpiredDeletedProjects();
    const project = await Project.findOne({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!project) {
      return next(createNotFoundError("Project not found in trash"));
    }
    project.deletedAt = null;
    project.restoreUntil = null;
    project.updatedAt = new Date();
    await project.save();
    await Task.updateMany(
      { projectId: req.params.id, deletedByProject: true },
      { $set: { deletedAt: null, restoreUntil: null, deletedByProject: false, updatedAt: new Date() } }
    );
    const doc = project.toJSON();
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}
