import mongoose from "mongoose";

const versionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const rolloutSchema = new mongoose.Schema({
  version: { type: String, required: true },
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
  
  rollbackThreshold: {
    type: Number, 
    default: 5
  },
  advanceThreshold: { 
    type: Number, 
    default: 1
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