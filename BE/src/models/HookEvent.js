import mongoose from "mongoose";

/**
 * Lưu sự kiện webhook (crawl/job) — idempotency theo jobId + hiển thị trên trang Automation.
 */
const hookEventSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    source: { type: String, default: "" },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    status: { type: String, default: "success" },
    notifiedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

hookEventSchema.index({ createdAt: -1 });

export const HookEvent = mongoose.model("HookEvent", hookEventSchema);
