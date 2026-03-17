import mongoose from "mongoose";
import aiModels from "../utils/constants.js";

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email : {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  accountType: {
    type: String,
    enum: ["test" , "live"],
    default: "test"
  },
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  config: {
    model: {
      type: String,
      enum: aiModels ? Object.keys(aiModels) : [],
      default: 'gpt-4'
    },
    systemPrompt: {
      type: String,
      default: 'You are a helpful assistant.'
    },
    temperature: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7
    },
    tokenBudget: {
      type: Number,
      default: 100000
    }
  }
}, { timestamps: true });

const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);

export default Tenant;