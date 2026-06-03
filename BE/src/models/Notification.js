import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: "User" },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_collaborator",
        "task_reassigned",
        "task_updated",
        "task_user_update",
        "deadline_reminder",
        "overdue_alert",
        "time_off_submitted",
        "time_off_status_updated",
      ],
      required: true,
    },
    /** Task liên quan (optional vì có notification thuộc domain khác như time-off). */
    taskId: { type: String, default: null, ref: "Task" },
    taskTitle: { type: String, default: "" },
    /** Tham chiếu Time-off request (nếu có). */
    timeOffId: { type: String, default: null, ref: "TimeOffRequest" },
    actorId: { type: String, default: null, ref: "User" },
    actorName: { type: String, default: "" },
    /** Tóm tắt các trường thay đổi cho type=task_updated, vd "status: Todo → InProgress". */
    changeSummary: { type: String, default: "" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.createdAt = ret.createdAt?.toISOString?.() ?? ret.createdAt;
    return ret;
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
