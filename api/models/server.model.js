import mongoose from "mongoose";

const serverSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true,
    trim: true
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  metadata: {
    hostname: { type: String },
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "production"
    },
    version: { type: String }
  }
}, { timestamps: true });

serverSchema.index({ tenantId: 1, serverId: 1 }, { unique: true });

// Index for finding stale servers (ones that haven't checked in recently)
serverSchema.index({ lastSeen: 1 });

export default mongoose.model("Server", serverSchema);