import mongoose from "mongoose";

/**
 * Ghi nhận jobId đã gửi webhook — dùng cho idempotency (tránh spam khi crawler retry).
 */
const hookEventSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    source: { type: String, default: "" },
    title: { type: String, default: "" },
    status: { type: String, default: "success" },
    notifiedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

export const HookEvent = mongoose.model("HookEvent", hookEventSchema);
