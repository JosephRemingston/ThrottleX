import crypto from 'crypto';

/**
 * Generates a secure API key + hashed version for storage
 */
export function generateApiKey({ prefix = "sk_live" } = {}) {
  // 1. Generate random bytes
  const keyBuffer = crypto.randomBytes(32); // 256-bit

  // 2. Convert to URL-safe base64 (no + / =)
  const rawKey = keyBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // 3. Create a short key ID (for fast DB lookup)
  const keyId = crypto.randomBytes(8).toString("hex");

  // 4. Final API key (what user sees)
  const apiKey = `${prefix}_${keyId}_${rawKey}`;

  // 5. Hash for storage (never store raw key)
  const hashedKey = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  return {
    apiKey,     // show this ONCE to user
    hashedKey,  // store this in DB
    keyId       // store for indexing/search
  };
}