import "dotenv/config";
import app from "./app.js";
import { connectDatabase, checkDatabase } from "./config/database.js";
import { startAutomationScheduler } from "./services/automationService.js";

const PORT = process.env.PORT || 6969;

async function start() {
  await connectDatabase();
  const check = await checkDatabase();
  if (check.ok) {
    console.log("DB check OK — users in DB:", check.usersCount);
    if (check.usersCount === 0) {
      console.warn("⚠️  Chưa có user trong DB. Chạy: npm run seed");
    }
  } else {
    console.warn("DB check:", check.message);
  }
  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
    startAutomationScheduler();
    console.log("Automation scheduler running (deadline/overdue alerts)");
  });
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
