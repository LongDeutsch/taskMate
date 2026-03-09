import crypto from "crypto";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { createNotFoundError } from "../utils/errors.js";

function newId() {
  return "proj-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function list(req, res, next) {
  try {
    const projects = await Project.find().sort({ updatedAt: -1 }).lean();
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
    const project = await Project.findById(req.params.id).lean();
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
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return next(createNotFoundError("Project not found"));
    }
    await Task.deleteMany({ projectId: req.params.id });
    res.status(200).json({ success: true, data: null, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
}
