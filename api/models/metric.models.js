import mongoose from "mongoose";

const metricSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true
  },
  configKey: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    required: true
  },
  errorRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  latencyMs: {
    type: Number,
    required: true,
    min: 0
  },
  requestCount: {
    type: Number,
    default: 0
  },
  reportedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: false });

metricSchema.index({ tenantId: 1, configKey: 1, version: 1, reportedAt: -1 });

// Auto-delete metrics older than 24 hours to keep the collection small
metricSchema.index(
  { reportedAt: 1 },
  { expireAfterSeconds: 86400 }
);

export default mongoose.model("Metric", metricSchema);