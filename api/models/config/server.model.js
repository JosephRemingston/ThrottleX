import mongoose  from 'mongoose';

const serverSchema = new mongoose.Schema({
  serverId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  customerApiKey: { 
    type: String, 
    required: true,
    index: true 
  },
  serverName: String,  // e.g., hostname
  environment: {
    type: String,
    enum: ['production', 'staging', 'development'],
    default: 'production'
  },
  
  // Track which configs this server is using
  activeConfigs: [{
    configId: { type: mongoose.Schema.Types.ObjectId, ref: 'Config' },
    version: String,
    assignedAt: Date
  }],
  
  lastPoll: { type: Date, default: Date.now },
  registeredAt: { type: Date, default: Date.now },
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
});

export default mongoose.model('Server', serverSchema);