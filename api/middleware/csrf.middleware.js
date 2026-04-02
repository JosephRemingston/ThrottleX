import ApiError from "../utils/ApiError.js";

const trustedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getRequestOrigin = (req) => {
  if (req.headers.origin) {
    return req.headers.origin;
  }

  if (!req.headers.referer) {
    return null;
  }

  try {
    return new URL(req.headers.referer).origin;
  } catch {
    return null;
  }
};

export const requireTrustedOriginForRefreshCookie = (req, res, next) => {
  if (!req.cookies?.refreshToken) {
    return next();
  }

  const requestOrigin = getRequestOrigin(req);

  if (!requestOrigin || !trustedOrigins.includes(requestOrigin)) {
    return next(new ApiError(403, "Cross-site cookie request blocked"));
  }

  return next();
};

export const verifyCsrfToken = (req, res, next) => {
  // Skip CSRF check for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const csrfTokenFromHeader = req.headers["x-csrf-token"];
  const csrfTokenFromCookie = req.cookies["csrf-token"];

  if (!csrfTokenFromHeader || !csrfTokenFromCookie) {
    return next(new ApiError(403, "CSRF token missing"));
  }

  if (csrfTokenFromHeader !== csrfTokenFromCookie) {
    return next(new ApiError(403, "Invalid CSRF token"));
  }

  return next();
};
