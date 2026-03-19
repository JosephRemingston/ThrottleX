import mongoose from 'mongoose';
import bcrypt from 'bcrypt';


const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ["test", "live"],
    default: "test"
  },
  apiKey: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String
  }

}, { timestamps: true });

TenantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});


TenantSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('Tenant', TenantSchema);