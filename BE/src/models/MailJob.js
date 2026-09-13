import mongoose from "mongoose";

export const MAIL_JOB_STATUSES = [
  "queued",
  "claimed",
  "need_credentials",
  "sending",
  "sent",
  "failed",
];

/**
 * Job gửi mail Xin off qua máy trạm (agent poll HTTP outbound).
 * Mật khẩu SMTP tạm (credentialsPasswordEnc) chỉ tồn tại đến khi agent lấy xong.
 */
const mailJobSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    status: {
      type: String,
      enum: MAIL_JOB_STATUSES,
      default: "queued",
      index: true,
    },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    /** Payload tạo TimeOffRequest sau khi gửi mail thành công */
    requestPayload: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Email đã dựng sẵn để agent gửi SMTP */
    mail: {
      to: { type: [String], default: [] },
      subject: { type: String, default: "" },
      text: { type: String, default: "" },
      html: { type: String, default: "" },
    },
    claimedBy: { type: String, default: "" },
    claimedAt: { type: Date, default: null },
    /** Email SMTP user nhập lần đầu (plain ok — không secret) */
    credentialsEmail: { type: String, default: "" },
    /** Mật khẩu tạm — xóa ngay khi agent claim credentials */
    credentialsPasswordEnc: { type: String, default: "" },
    credentialsReadyAt: { type: Date, default: null },
    error: { type: String, default: "" },
    sentTo: { type: [String], default: [] },
    timeOffId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, id: false }
);

mailJobSchema.index({ status: 1, createdAt: 1 });
mailJobSchema.index({ claimedBy: 1, status: 1 });

export const MailJob = mongoose.model("MailJob", mailJobSchema);
