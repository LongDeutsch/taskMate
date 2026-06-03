import mongoose from "mongoose";

const responseHistorySchema = new mongoose.Schema(
  {
    content: { type: String, required: true, maxlength: 5000 },
    /** sent: lần đầu; edit: chỉnh sửa khi PM chưa phản hồi; append: bổ sung sau khi PM phản hồi. */
    kind: { type: String, enum: ["sent", "edit", "append"], required: true },
    createdAt: { type: Date, default: Date.now },
    authorId: { type: String, required: true },
    authorName: { type: String, default: "" },
  },
  { _id: true }
);

const feedbackHistorySchema = new mongoose.Schema(
  {
    content: { type: String, required: true, maxlength: 5000 },
    /** sent: lần đầu; edit: chỉnh sửa các lần sau. */
    kind: { type: String, enum: ["sent", "edit"], required: true },
    createdAt: { type: Date, default: Date.now },
    authorId: { type: String, required: true },
    authorName: { type: String, default: "" },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    /** Optional: self-note của admin có thể không gắn project. */
    projectId: { type: String, default: null, ref: "Project" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    feedback: { type: String, default: "", maxlength: 5000 },
    /** Mốc thời gian PM cập nhật feedback gần nhất (so sánh với userResponseSentAt). */
    feedbackUpdatedAt: { type: Date, default: null },
    /** Lịch sử các lần PM gửi/chỉnh feedback (user xem được). */
    feedbackHistory: { type: [feedbackHistorySchema], default: [] },
    /** Phản hồi từ phía USER gửi cho PM (snapshot mới nhất, công khai cho PM). */
    userResponse: { type: String, default: "", maxlength: 5000 },
    /** Bản nháp của user, KHÔNG hiển thị cho PM, auto-save trong khi soạn. */
    userResponseDraft: { type: String, default: "", maxlength: 5000 },
    /** Lịch sử các lần gửi/chỉnh sửa/bổ sung phản hồi. */
    userResponseHistory: { type: [responseHistorySchema], default: [] },
    /** Mốc thời gian user gửi phản hồi gần nhất. */
    userResponseSentAt: { type: Date, default: null },
    status: { type: String, enum: ["Todo", "InProgress", "Done"], default: "Todo" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    deadline: { type: String, required: true },
    assigneeId: { type: String, default: null, ref: "User" },
    collaboratorIds: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
    restoreUntil: { type: Date, default: null },
    deletedByProject: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

taskSchema.index({ projectId: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ deadline: 1 });

taskSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    ret.createdAt = ret.createdAt?.toISOString?.() ?? ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() ?? ret.updatedAt;
    if (ret.feedbackUpdatedAt)
      ret.feedbackUpdatedAt = ret.feedbackUpdatedAt?.toISOString?.() ?? ret.feedbackUpdatedAt;
    if (ret.userResponseSentAt)
      ret.userResponseSentAt = ret.userResponseSentAt?.toISOString?.() ?? ret.userResponseSentAt;
    if (Array.isArray(ret.userResponseHistory)) {
      ret.userResponseHistory = ret.userResponseHistory.map((h) => ({
        ...h,
        id: h._id?.toString?.() ?? h.id,
        createdAt: h.createdAt?.toISOString?.() ?? h.createdAt,
      }));
    }
    if (Array.isArray(ret.feedbackHistory)) {
      ret.feedbackHistory = ret.feedbackHistory.map((h) => ({
        ...h,
        id: h._id?.toString?.() ?? h.id,
        createdAt: h.createdAt?.toISOString?.() ?? h.createdAt,
      }));
    }
    return ret;
  },
});

export const Task = mongoose.model("Task", taskSchema);
