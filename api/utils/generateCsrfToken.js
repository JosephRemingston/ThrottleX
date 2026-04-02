import crypto from "crypto";

/**
 * @returns {string}
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};