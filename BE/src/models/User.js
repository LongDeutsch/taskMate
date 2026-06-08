import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "USER"], required: true },
    /**
     * Vai trò hiển thị (HR / Staff / Admin / BODs). Permission RBAC vẫn dựa vào
     * `role` (ADMIN/USER); HR và BODS hiện tạm map xuống quyền USER.
     */
    roleLabel: {
      type: String,
      enum: ["ADMIN", "STAFF", "HR", "BODS"],
      default: null,
    },
    disabled: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    restoreUntil: { type: Date, default: null },
    // Profile
    dateOfBirth: { type: Date, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    joinDate: { type: Date, default: null },
    position: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    webmailUrl: { type: String, default: "https://mail.cybertech.com.vn/mail/" },
    smtpHost: { type: String, default: "mail.cybertech.com.vn" },
    /** Mã hóa AES — dùng gửi SMTP */
    webmailPasswordEnc: { type: String, default: null, select: false },
    /** Hash bcrypt — xác minh đã cấu hình, không trả client */
    webmailPasswordHash: { type: String, default: null, select: false },
    avatar: { type: String, default: null },
  },
  { timestamps: false, id: false }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.webmailPasswordEnc;
    delete ret.webmailPasswordHash;
    ret.id = ret._id;
    if (ret.joinDate) ret.joinDate = ret.joinDate.toISOString?.()?.slice(0, 10) ?? ret.joinDate;
    if (ret.dateOfBirth) {
      ret.dateOfBirth = ret.dateOfBirth.toISOString?.()?.slice(0, 10) ?? ret.dateOfBirth;
    }
    if (!ret.roleLabel) ret.roleLabel = ret.role === "ADMIN" ? "ADMIN" : "STAFF";
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
