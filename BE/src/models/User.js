import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "USER"], required: true },
    disabled: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    restoreUntil: { type: Date, default: null },
    // Profile
    age: { type: Number, default: null },
    gender: { type: String, default: null },
    joinDate: { type: Date, default: null },
    position: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { timestamps: false, id: false }
);

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    ret.id = ret._id;
    if (ret.joinDate) ret.joinDate = ret.joinDate.toISOString?.()?.slice(0, 10) ?? ret.joinDate;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
