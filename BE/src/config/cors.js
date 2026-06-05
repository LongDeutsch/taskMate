/** @returns {string[]} */
function getAllowedOrigins() {
  const fromEnv = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : []),
  ];
  const defaults = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://task-mate-nine-nu.vercel.app",
  ];
  return [...new Set([...defaults, ...fromEnv])];
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (getAllowedOrigins().includes(origin)) return true;
  // Vercel production + preview URLs
  if (/^https:\/\/[\w.-]+\.vercel\.app$/.test(origin)) return true;
  // Dev: cho phép mọi origin local
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
    } else {
      console.warn("[CORS] Blocked origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};
