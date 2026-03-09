/**
 * Seed script: đọc 3 file JSON từ BE/data, hash mật khẩu user (bcrypt),
 * rồi insert vào MongoDB (database: taskmate).
 *
 * Chạy: npm run seed  (từ thư mục BE)
 * Yêu cầu: MongoDB đang chạy (xem MONGODB_URI trong .env)
 */

import "dotenv/config";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "taskmate";
const BCRYPT_ROUNDS = 12; // độ mạnh salt (càng cao càng chậu nhưng an toàn hơn)

const dataDir = join(__dirname, "..", "data");

function loadJson(filename) {
  const path = join(dataDir, filename);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

async function seed() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB:", MONGODB_URI);

    const db = client.db(DB_NAME);

    // --- 1. Users: hash password rồi insert (dùng id làm _id để task assigneeId/projectId khớp)
    const usersRaw = loadJson("users.json");
    const users = await Promise.all(
      usersRaw.map(async (u) => {
        const hashedPassword = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
        return {
          _id: u.id,
          username: u.username,
          password: hashedPassword,
          fullName: u.fullName,
          role: u.role,
          disabled: u.disabled ?? false,
        };
      })
    );

    await db.collection("users").deleteMany({});
    const userResult = await db.collection("users").insertMany(users);
    console.log("Users inserted:", userResult.insertedCount);

    // --- 2. Projects
    const projectsRaw = loadJson("projects.json");
    const projects = projectsRaw.map((p) => ({
      _id: p.id,
      name: p.name,
      description: p.description,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));

    await db.collection("projects").deleteMany({});
    const projectResult = await db.collection("projects").insertMany(projects);
    console.log("Projects inserted:", projectResult.insertedCount);

    // --- 3. Tasks (giữ projectId, assigneeId dạng string khớp _id của project/user)
    const tasksRaw = loadJson("tasks.json");
    const tasks = tasksRaw.map((t) => ({
      _id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline,
      assigneeId: t.assigneeId,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }));

    await db.collection("tasks").deleteMany({});
    const taskResult = await db.collection("tasks").insertMany(tasks);
    console.log("Tasks inserted:", taskResult.insertedCount);

    // --- Index cho query thường dùng
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("tasks").createIndex({ projectId: 1 });
    await db.collection("tasks").createIndex({ assigneeId: 1 });
    await db.collection("tasks").createIndex({ status: 1 });
    await db.collection("tasks").createIndex({ deadline: 1 });
    console.log("Indexes created.");

    console.log("\nSeed hoàn tất. Database:", DB_NAME);
    console.log("Tài khoản đăng nhập (password đã hash trong DB):");
    console.log("  - pm / admin123 (ADMIN)");
    console.log("  - nguyenvana / 123456 (USER), ...");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

seed();
