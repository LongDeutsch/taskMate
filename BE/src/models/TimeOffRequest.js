import mongoose from "mongoose";

const REASON_ENUM = ["ANNUAL_LEAVE", "WFH", "BUSINESS_TRIP", "OTHER"];
const SESSION_ENUM = ["MORNING", "AFTERNOON", "FULL"];
const STATUS_ENUM = ["pending", "approved", "rejected"];

const timeOffSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, ref: "User" },
    /** Snapshot tên + role tại thời điểm tạo, để HR thấy được kể cả sau khi user bị đổi tên/xoá. */
    userName: { type: String, default: "" },
    userRoleLabel: { type: String, default: null },
    /** Người nhận đơn xin off. Mặc định FE chọn HR, user có thể thêm Admin/BODs. */
    recipientIds: { type: [String], default: [] },
    recipients: {
      type: [
        {
          id: { type: String, required: true },
          fullName: { type: String, default: "" },
          username: { type: String, default: "" },
          roleLabel: { type: String, default: null },
        },
      ],
      default: [],
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    session: { type: String, enum: SESSION_ENUM, required: true },

    reason: { type: String, enum: REASON_ENUM, required: true },
    /** Bắt buộc khi reason === "OTHER". */
    reasonOther: { type: String, default: "" },

    status: { type: String, enum: STATUS_ENUM, default: "pending" },
    /** Người thay đổi status (HR). */
    decidedById: { type: String, default: null, ref: "User" },
    decidedByName: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

timeOffSchema.index({ userId: 1, createdAt: -1 });
timeOffSchema.index({ status: 1, createdAt: -1 });

timeOffSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id;
    if (ret.startDate) ret.startDate = ret.startDate.toISOString?.()?.slice(0, 10) ?? ret.startDate;
    if (ret.endDate) ret.endDate = ret.endDate.toISOString?.()?.slice(0, 10) ?? ret.endDate;
    if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString?.() ?? ret.createdAt;
    if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString?.() ?? ret.updatedAt;
    if (ret.decidedAt) ret.decidedAt = ret.decidedAt.toISOString?.() ?? ret.decidedAt;
    return ret;
  },
});

export const TimeOffRequest = mongoose.model("TimeOffRequest", timeOffSchema);
export const TIME_OFF_REASONS = REASON_ENUM;
export const TIME_OFF_SESSIONS = SESSION_ENUM;
export const TIME_OFF_STATUSES = STATUS_ENUM;
