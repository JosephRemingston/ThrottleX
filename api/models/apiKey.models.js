import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    keyId: {
      type: String,
      required: true,
      unique: true, // short identifier (prefix part)
      index: true,
    },
    keyHash: {
      type: String,
      required: true, // hashed full API key
      select: false,  // never return in queries by default
    },
    lastUsed: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Object, // optional extra info (IP, app version, etc.)
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ApiKey", apiKeySchema);