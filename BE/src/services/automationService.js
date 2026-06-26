import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { createNotification } from "../controllers/notificationController.js";

const AUTOMATION_ACTOR = {
  id: "system-automation",
  name: "TaskMate Automation",
};

const POLL_INTERVAL_MS = 15 * 60 * 1000;
let intervalHandle = null;
let runInProgress = false;

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysKey(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function uniq(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

async function getActiveAdminIds() {
  const admins = await User.find({
    role: "ADMIN",
    disabled: false,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  return admins.map((u) => u._id);
}

async function alreadyNotifiedToday({ userId, taskId, type, since }) {
  const count = await Notification.countDocuments({
    userId,
    taskId,
    type,
    createdAt: { $gte: since },
  });
  return count > 0;
}

async function notifyRecipientsOnceToday({ task, recipients, type, changeSummary, since }) {
  await Promise.all(
    recipients.map(async (userId) => {
      if (await alreadyNotifiedToday({ userId, taskId: task._id, type, since })) {
        return null;
      }
      return createNotification({
        userId,
        type,
        taskId: task._id,
        taskTitle: task.title ?? "",
        actorId: AUTOMATION_ACTOR.id,
        actorName: AUTOMATION_ACTOR.name,
        changeSummary,
      });
    })
  );
}

/**
 * Đánh giá 1 task cụ thể và bắn deadline_reminder/overdue_alert nếu phù hợp.
 * Dùng để gọi ngay sau khi task được tạo/cập nhật, không phải đợi tick tiếp theo
 * của scheduler. Có duplicate-guard theo ngày như runDeadlineAutomationOnce.
 */
export async function checkTaskDeadline(task) {
  if (!task) return;
  if (task.deletedAt) return;
  if (task.status === "Done") return;
  if (!task.deadline) return;

  const since = startOfToday();
  const today = dateKey();
  const tomorrow = addDaysKey(1);

  let type = null;
  let changeSummary = null;

  if (task.deadline === tomorrow) {
    type = "deadline_reminder";
    changeSummary = `Deadline còn 1 ngày (${task.deadline})`;
  } else if (task.deadline < today) {
    type = "overdue_alert";
    changeSummary = `Task đã quá hạn (${task.deadline})`;
  } else {
    return;
  }

  try {
    const adminIds = await getActiveAdminIds();
    // Chỉ thông báo cho assignee (tài khoản nhận task) + admin/PM.
    // Collaborators KHÔNG nhận để tránh spam — task của ai thì chỉ người đó + PM biết.
    const recipients = uniq([task.assigneeId, ...adminIds]);
    await notifyRecipientsOnceToday({
      task,
      recipients,
      type,
      changeSummary,
      since,
    });
  } catch (err) {
    console.warn("[automation] checkTaskDeadline failed:", err?.message ?? err);
  }
}

/**
 * Deadline reminder: task chưa Done, deadline còn 1 ngày.
 * Overdue alert: task chưa Done, deadline đã qua.
 * Người nhận: chỉ assignee (tài khoản nhận task) + tất cả ADMIN/PM active.
 * Collaborators KHÔNG nhận để tránh spam.
 */
export async function runDeadlineAutomationOnce() {
  if (runInProgress) return;
  runInProgress = true;
  try {
    const since = startOfToday();
    const today = dateKey();
    const tomorrow = addDaysKey(1);
    const adminIds = await getActiveAdminIds();

    const dueTomorrowTasks = await Task.find({
      deletedAt: null,
      status: { $ne: "Done" },
      deadline: tomorrow,
    }).lean();

    for (const task of dueTomorrowTasks) {
      const recipients = uniq([task.assigneeId, ...adminIds]);
      await notifyRecipientsOnceToday({
        task,
        recipients,
        type: "deadline_reminder",
        changeSummary: `Deadline còn 1 ngày (${task.deadline})`,
        since,
      });
    }

    const overdueTasks = await Task.find({
      deletedAt: null,
      status: { $ne: "Done" },
      deadline: { $lt: today },
    }).lean();

    for (const task of overdueTasks) {
      const recipients = uniq([task.assigneeId, ...adminIds]);
      await notifyRecipientsOnceToday({
        task,
        recipients,
        type: "overdue_alert",
        changeSummary: `Task đã quá hạn (${task.deadline})`,
        since,
      });
    }
  } catch (err) {
    console.warn("[automation] deadline/overdue run failed:", err?.message ?? err);
  } finally {
    runInProgress = false;
  }
}

/**
 * Dọn task đã hết hạn lưu thùng rác. Trước đây chạy ở mỗi request GET /api/tasks
 * (hot path); chuyển sang chạy nền theo scheduler để list nhanh hơn.
 */
async function purgeExpiredTrashedTasks() {
  try {
    await Task.deleteMany({
      deletedAt: { $ne: null },
      restoreUntil: { $ne: null, $lt: new Date() },
    });
  } catch (err) {
    console.warn("[automation] purge expired tasks failed:", err?.message ?? err);
  }
}

async function runSchedulerTick() {
  await purgeExpiredTrashedTasks();
  await runDeadlineAutomationOnce();
}

export function startAutomationScheduler() {
  if (intervalHandle) return intervalHandle;
  runSchedulerTick().catch(() => {});
  intervalHandle = setInterval(() => {
    runSchedulerTick().catch(() => {});
  }, POLL_INTERVAL_MS);
  return intervalHandle;
}

