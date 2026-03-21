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
  isVerified: {
    type: Boolean,
    default: false
  },
  refreshToken: {
    type: String
  }

}, { timestamps: true });

TenantSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});


TenantSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('Tenant', TenantSchema);