export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join("; ");
  }
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid id";
  }
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate value";
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "Ảnh tối đa 3MB";
  }

  const isDev = process.env.NODE_ENV !== "production";
  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && err.stack && { error: err.stack }),
  });
}
