import crypto from 'crypto';

export function generateApiKey({ prefix } = {}) {
  const keyBuffer = crypto.randomBytes(32); // 256-bit

  const rawKey = keyBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const keyId = crypto.randomBytes(8).toString("hex");

  const apiKey = `${prefix}_${keyId}_${rawKey}`;

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