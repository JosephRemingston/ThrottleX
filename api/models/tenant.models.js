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
  }
}, { timestamps: true });

const Tenant = mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);

export default Tenant;