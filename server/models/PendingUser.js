import mongoose from "mongoose";

/**
 * Temporary record for a registration that has not completed email
 * verification yet. The OTP itself is never stored in plain text.
 */
const PendingUserSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpire: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.PendingUser ||
  mongoose.model("PendingUser", PendingUserSchema);
