import { describe, expect, jest, test } from "@jest/globals";
import { verifyCsrfToken } from "../api/middleware/csrf.middleware.js";

describe("csrf.middleware", () => {
  test.each(["/api/auth/login", "/api/auth/register"])(
    "verifyCsrfToken exempts %s before a csrf cookie exists",
    (originalUrl) => {
      const next = jest.fn();

      verifyCsrfToken(
        {
          method: "POST",
          originalUrl,
          path: originalUrl.replace("/api/auth", ""),
          headers: {},
          cookies: {}
        },
        {},
        next
      );

      expect(next).toHaveBeenCalledWith();
    }
  );

  test("verifyCsrfToken rejects protected state-changing routes without csrf tokens", () => {
    const next = jest.fn();

    verifyCsrfToken(
      {
        method: "POST",
        originalUrl: "/api/tenant/send",
        path: "/send",
        headers: {},
        cookies: {}
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "CSRF token missing"
      })
    );
  });

  test("verifyCsrfToken accepts protected routes when header and cookie tokens match", () => {
    const next = jest.fn();

    verifyCsrfToken(
      {
        method: "POST",
        originalUrl: "/api/tenant/send",
        path: "/send",
        headers: { "x-csrf-token": "csrf-123" },
        cookies: { "csrf-token": "csrf-123" }
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
  });

  test("verifyCsrfToken exempts server-to-server routes using originalUrl", () => {
    const next = jest.fn();

    verifyCsrfToken(
      {
        method: "POST",
        originalUrl: "/api/poll/register?sync=true",
        path: "/register",
        headers: {},
        cookies: {}
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
