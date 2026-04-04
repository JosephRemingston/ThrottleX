const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  id: { type: String, required: true },  // e.g., "v1", "v2"
  data: { type: Object, required: true }, // Actual config JSON
  createdAt: { type: Date, default: Date.now }
});

const rolloutSchema = new mongoose.Schema({
  version: { type: String, required: true },  // e.g., "v1"
  percentage: { type: Number, required: true, min: 0, max: 100 }
});

const configSchema = new mongoose.Schema({
  customerApiKey: { 
    type: String, 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  
  versions: [versionSchema],
  
  rolloutPercentages: [rolloutSchema],
  
  // Health check thresholds
  rollbackThreshold: { 
    type: Number, 
    default: 5  // Rollback if error rate > 5%
  },
  advanceThreshold: { 
    type: Number, 
    default: 1  // Advance if error rate < 1%
  },
  
  status: { 
    type: String, 
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for faster lookups
configSchema.index({ customerApiKey: 1, name: 1 }, { unique: true });

export default mongoose.model('Config', configSchema);