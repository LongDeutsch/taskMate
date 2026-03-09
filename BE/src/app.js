import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkDatabase } from "./config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/avatars", express.static(path.join(__dirname, "..", "uploads", "avatars")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);

app.get("/health", async (req, res) => {
  const check = await checkDatabase();
  if (!check.ok) {
    return res.status(503).json({ success: false, message: "DB not ready", error: check.message });
  }
  res.json({
    success: true,
    message: "ok",
    db: check.dbName,
    usersCount: check.usersCount,
  });
});

app.use(errorHandler);

export default app;
