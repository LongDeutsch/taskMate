import mongoose from "mongoose";

/**
 * Yêu cầu cập nhật email/mật khẩu SMTP trên máy trạm (ghi đè accounts.json).
 * passwordEnc chỉ tồn tại đến khi agent lấy xong.
 */
const mailStationAccountSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    passwordEnc: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "applied", "failed"],
      default: "pending",
      index: true,
    },
    error: { type: String, default: "" },
    claimedBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

mailStationAccountSchema.index({ status: 1, createdAt: 1 });

export const MailStationAccount = mongoose.model(
  "MailStationAccount",
  mailStationAccountSchema
);
