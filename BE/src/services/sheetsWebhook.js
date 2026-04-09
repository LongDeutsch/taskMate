function getEnv(name, fallback = "") {
  const v = process.env[name];
  if (typeof v !== "string") return fallback;
  return v.trim();
}

function withSecret(url, secret) {
  if (!secret) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("secret")) u.searchParams.set("secret", secret);
    return u.toString();
  } catch {
    // If URL parsing fails, best effort: append ?secret=...
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}secret=${encodeURIComponent(secret)}`;
  }
}

/**
 * Post task change event to Apps Script Web App.
 *
 * Env:
 * - SHEETS_WEBHOOK_URL: https://script.google.com/macros/s/.../exec
 * - SHEETS_WEBHOOK_SECRET: optional; appended as ?secret=...
 */
export async function postTaskToSheets({ event, task, actor }) {
  const baseUrl = getEnv("SHEETS_WEBHOOK_URL");
  if (!baseUrl) return { skipped: true, reason: "missing_url" };

  const secret = getEnv("SHEETS_WEBHOOK_SECRET");
  const url = withSecret(baseUrl, secret);

  // Keep payload small + stable
  const payload = {
    source: "taskMate",
    event: event || "upsert",
    actor: actor
      ? { id: actor.id || null, role: actor.role || null, username: actor.username || null }
      : null,
    task,
    at: new Date().toISOString(),
  };

  const timeoutMs = Number(getEnv("SHEETS_WEBHOOK_TIMEOUT_MS", "5000")) || 5000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const reqInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    };

    // Apps Script `.../exec` often responds with 302 to googleusercontent.
    // Some fetch implementations may change POST->GET on 301/302/303, causing `doGet` errors.
    // We follow redirect manually and re-POST to the Location.
    const res1 = await fetch(url, { ...reqInit, redirect: "manual" });
    const loc = res1.headers?.get?.("location");
    if (res1.status >= 300 && res1.status < 400 && loc) {
      const res2 = await fetch(loc, { ...reqInit, redirect: "manual" });
      const text2 = await res2.text().catch(() => "");
      return { ok: res2.ok, status: res2.status, redirected: true, body: text2 };
    }

    const text1 = await res1.text().catch(() => "");
    return { ok: res1.ok, status: res1.status, redirected: false, body: text1 };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    clearTimeout(t);
  }
}

