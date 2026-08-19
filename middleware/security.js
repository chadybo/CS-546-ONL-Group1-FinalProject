const WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const authAttempts = new Map();

export const cleanupExpiredAuthAttempts = (
  now = Date.now(),
  attempts = authAttempts,
) => {
  let removed = 0;
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) {
      attempts.delete(key);
      removed += 1;
    }
  }
  return removed;
};

const authCleanupTimer = setInterval(
  cleanupExpiredAuthAttempts,
  CLEANUP_INTERVAL_MS,
);
authCleanupTimer.unref?.();

export const publicError = (error, fallback = "The request could not be completed") =>
  typeof error === "string" ? error : fallback;

export const securityHeaders = (req, res, next) => {
  res.set({
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
};

export const authRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip;
  const current = authAttempts.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;
  entry.count += 1;
  authAttempts.set(key, entry);

  res.set("RateLimit-Limit", String(MAX_AUTH_ATTEMPTS));
  res.set("RateLimit-Remaining", String(Math.max(0, MAX_AUTH_ATTEMPTS - entry.count)));
  res.set("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > MAX_AUTH_ATTEMPTS) {
    res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    const message = "Too many authentication attempts. Please wait 15 minutes and try again.";
    if (req.is("application/json")) {
      return res.status(429).json({ error: message });
    }
    return res.status(429).render("error", {
      title: "Too many attempts",
      message,
    });
  }
  next();
};

export const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
