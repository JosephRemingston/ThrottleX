import mongoose from 'mongoose';

const metricSchema = new mongoose.Schema({
  serverId: { 
    type: String, 
    required: true,
    index: true 
  },
  configId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Config',
    required: true,
    index: true
  },
  version: { 
    type: String, 
    required: true 
  },
  
  // Metrics
  errorRate: { type: Number, default: 0 },      // Percentage
  latency: { type: Number, default: 0 },        // Milliseconds
  crashCount: { type: Number, default: 0 },
  requestCount: { type: Number, default: 0 },
  
  // Custom metrics (optional)
  customMetrics: { type: Object, default: {} },
  
  timestamp: { type: Date, default: Date.now, index: true }
});

// Compound index for efficient queries
metricSchema.index({ configId: 1, version: 1, timestamp: -1 });

// TTL index - auto-delete metrics older than 30 days
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('Metric', metricSchema);