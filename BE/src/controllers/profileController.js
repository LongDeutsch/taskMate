import { User } from "../models/User.js";
import { createNotFoundError } from "../utils/errors.js";
import { createBadRequestError } from "../utils/errors.js";
import { calcAgeFromDateOfBirth, formatDateOnly, getProfileAgeError } from "../utils/birthday.js";
import { avatarFromUploadedFile } from "../utils/avatarStorage.js";
import { formatPublicUser } from "../utils/userFormat.js";
import {
  encryptWebmailPassword,
  hashWebmailPassword,
  DEFAULT_WEBMAIL_URL,
  DEFAULT_SMTP_HOST,
} from "../utils/mailCredentials.js";

function normalizeEmail(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  const email = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createBadRequestError("Email không hợp lệ");
  }
  return email;
}

function normalizePhone(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  const phone = String(value).trim();
  if (!/^[+0-9\s\-().]{8,20}$/.test(phone)) {
    throw createBadRequestError("Số điện thoại không hợp lệ");
  }
  return phone;
}

function normalizeWebmailUrl(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return DEFAULT_WEBMAIL_URL;
  const url = String(value).trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    throw createBadRequestError("Địa chỉ webmail phải là URL (https://...)");
  }
  return url.replace(/\/$/, "") + "/";
}

function normalizeSmtpHost(value) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return DEFAULT_SMTP_HOST;
  const host = String(value).trim().replace(/^https?:\/\//, "").split("/")[0];
  if (!host) throw createBadRequestError("SMTP host không hợp lệ");
  return host;
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
      .select("-password +webmailPasswordEnc +webmailPasswordHash")
      .lean();
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    res.json({ success: true, data: formatPublicUser(user, { includeWebmail: true }) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      joinDate,
      position,
      phone,
      email,
      webmailUrl,
      smtpHost,
      webmailPassword,
    } = req.body;
    const user = await User.findById(req.user.id).select("+webmailPasswordEnc +webmailPasswordHash");
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    if (fullName !== undefined) {
      const name = String(fullName).trim();
      if (!name) return next(createBadRequestError("Họ và tên không được để trống"));
      user.fullName = name;
    }
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const ageError = getProfileAgeError(dateOfBirth);
        if (ageError) return next(createBadRequestError(ageError));
        const [y, m, d] = String(dateOfBirth).split("-").map(Number);
        user.dateOfBirth = new Date(Date.UTC(y, m - 1, d));
        user.age = calcAgeFromDateOfBirth(user.dateOfBirth);
      } else {
        user.dateOfBirth = null;
        user.age = null;
      }
    }
    if (gender !== undefined) user.gender = gender || null;
    if (joinDate !== undefined) user.joinDate = joinDate ? new Date(joinDate) : null;
    if (position !== undefined) user.position = position || null;
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone !== undefined) user.phone = normalizedPhone;
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail !== undefined) user.email = normalizedEmail;
    const normalizedWebmailUrl = normalizeWebmailUrl(webmailUrl);
    if (normalizedWebmailUrl !== undefined) user.webmailUrl = normalizedWebmailUrl;
    const normalizedSmtpHost = normalizeSmtpHost(smtpHost);
    if (normalizedSmtpHost !== undefined) user.smtpHost = normalizedSmtpHost;
    if (webmailPassword !== undefined && webmailPassword !== null && String(webmailPassword).trim() !== "") {
      const plain = String(webmailPassword);
      user.webmailPasswordEnc = encryptWebmailPassword(plain);
      user.webmailPasswordHash = await hashWebmailPassword(plain);
    }
    if (req.file) {
      user.avatar = avatarFromUploadedFile(req.file);
    }
    await user.save();
    const doc = user.toJSON();
    res.json({
      success: true,
      data: formatPublicUser(
        { ...doc, _id: doc._id, webmailPasswordEnc: user.webmailPasswordEnc, webmailPasswordHash: user.webmailPasswordHash },
        { includeWebmail: true }
      ),
    });
  } catch (err) {
    next(err);
  }
}
