import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "taskmate";

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log("MongoDB connected, database:", DB_NAME);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
}

/** Kiểm tra DB có dữ liệu (số user). Gọi sau khi connect. */
export async function checkDatabase() {
  const db = mongoose.connection.db;
  if (!db) return { ok: false, message: "DB not ready" };
  try {
    const usersCount = await db.collection("users").countDocuments();
    return { ok: true, dbName: DB_NAME, usersCount };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
