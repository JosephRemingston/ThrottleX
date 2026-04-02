import mongoose from "mongoose";

const versionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const rolloutSchema = new mongoose.Schema({
  version: { type: Number },
  percentage: { type: Number, default: 5 },
  status: {
    type: String,
    enum: ["in_progress", "completed", "reverted", "paused"],
    default: "in_progress"
  },
  v2ServerIds: [{ type: String }],
  startedAt: { type: Date, default: Date.now }
}, { _id: false });

const configSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  versions: [versionSchema],
  activeVersion: { type: Number, default: 1 },
  rollout: { type: rolloutSchema, default: null }
}, { timestamps: true });

configSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export default mongoose.model("Config", configSchema);