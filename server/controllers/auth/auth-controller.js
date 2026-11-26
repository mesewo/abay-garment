import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../../models/User.js";
import PendingUser from "../../models/PendingUser.js";
import {
  signAuthToken,
  requireAuth,
  requireRole,
  authCookieOptions,
  clearAuthCookieOptions,
} from "../../middleware/auth.js";
import { sendMail, sendOtpEmail } from "../../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const publicUser = (user) => ({
  email: user.email,
  role: user.role,
  id: user._id,
  userName: user.userName,
  lastLogin: user.lastLogin,
});

const setAuthCookie = (res, user) =>
  res.cookie("token", signAuthToken(user), authCookieOptions());

// Register
export const registerUser = async (req, res) => {
  const { userName, email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    if (!userName || typeof userName !== "string" || userName.trim().length < 3) {
      return res
        .status(400)
        .json({ success: false, message: "Username must be at least 3 characters." });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with the same email! Please try again",
      });
    }

    const hashPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();

    await PendingUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        userName: userName.trim(),
        email: normalizedEmail,
        password: hashPassword,
        otpHash: hashOtp(otp),
        otpExpire: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      success: true,
      message: "Please verify your email with the OTP sent.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Some error occurred" });
  }
};

// Login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    if (!EMAIL_REGEX.test(normalizedEmail) || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    const checkUser = await User.findOne({ email: normalizedEmail });
    if (!checkUser) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exist! Please register first",
      });
    }

    if (checkUser.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        isBlocked: true,
      });
    }

    if (!checkUser.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const checkPasswordMatch = await bcrypt.compare(password, checkUser.password);
    if (!checkPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password! Please try again",
      });
    }

    checkUser.lastLogin = new Date();
    await checkUser.save();

    setAuthCookie(res, checkUser);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: publicUser(checkUser),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Some error occurred" });
  }
};

// Google Login
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Google credential." });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ success: false, message: "Google sign-in is not configured." });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res
        .status(401)
        .json({ success: false, message: "Google account email is not verified." });
    }

    const email = normalizeEmail(payload.email);
    const googleId = payload.sub;
    const name = typeof payload.name === "string" ? payload.name.trim() : "";

    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (!user) {
      const baseName = (name || email.split("@")[0] || "googleuser")
        .replace(/\s+/g, "")
        .toLowerCase()
        .slice(0, 20);
      const userName = `${baseName}${crypto.randomInt(1000, 10000)}`;

      user = await User.create({
        userName,
        email,
        googleId,
        isEmailVerified: true,
        lastLogin: new Date(),
        profile: {
          firstName: name.split(" ")[0] || "Google",
          lastName: name.split(" ").slice(1).join(" ") || "User",
        },
        role: "buyer",
      });
    } else if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        isBlocked: true,
      });
    } else {
      user.lastLogin = new Date();
      if (!user.googleId) user.googleId = googleId;
      if (!user.isEmailVerified) user.isEmailVerified = true;
      await user.save();
    }

    setAuthCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully with Google",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Google login failed. Please try again." });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email." });
    }

    const user = await User.findOne({ email });
    // Always return the same response to avoid leaking which emails exist.
    if (!user) {
      return res.json({
        success: true,
        message: "If this email exists in our system, a password reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/auth/reset-password/${resetToken}`;

    await sendMail({
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your Abay Garment account.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p>This link is valid for 30 minutes.</p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: "If this email exists in our system, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending password reset email. Please try again later.",
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Token and password are required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Password Changed Successfully",
      html: `<p>Your password has been changed successfully.</p><p>If you did not make this change, contact support immediately.</p>`,
    });

    return res.json({
      success: true,
      message: "Password updated successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error resetting password. Please try again." });
  }
};

// Logout
export const logoutUser = (req, res) => {
  res.clearCookie("token", clearAuthCookieOptions()).json({
    success: true,
    message: "Logged out successfully!",
  });
};

// Email verification
export const verifyEmailOTP = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;

  try {
    if (!EMAIL_REGEX.test(email) || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const pending = await PendingUser.findOne({ email });
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: "No registration in progress for this email.",
      });
    }

    if (pending.otpExpire.getTime() < Date.now()) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res
        .status(400)
        .json({ success: false, message: "OTP expired. Please register again." });
    }

    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await PendingUser.deleteOne({ _id: pending._id });
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please register again.",
      });
    }

    const expected = Buffer.from(pending.otpHash, "hex");
    const received = Buffer.from(hashOtp(otp), "hex");
    const matches =
      expected.length === received.length && crypto.timingSafeEqual(expected, received);

    if (!matches) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await User.create({
      userName: pending.userName,
      email: pending.email,
      password: pending.password,
      isEmailVerified: true,
      lastLogin: new Date(),
      role: "buyer",
    });

    await PendingUser.deleteOne({ _id: pending._id });

    return res.json({
      success: true,
      message: "Email verified and account created successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That username or email is already in use. Please try another.",
      });
    }
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const resendOTP = async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email." });
    }

    const pending = await PendingUser.findOne({ email });
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: "No registration in progress for this email. Please register again.",
      });
    }

    const otp = generateOtp();
    pending.otpHash = hashOtp(otp);
    pending.otpExpire = new Date(Date.now() + OTP_TTL_MS);
    pending.attempts = 0;
    await pending.save();

    await sendOtpEmail(email, otp);

    return res.json({ success: true, message: "OTP resent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ success: false, message: "Could not resend OTP" });
  }
};

// Backwards-compatible middleware names used across the existing routers.
export const authMiddleware = requireAuth;
export const sellerAuthMiddleware = requireRole("seller");
export const buyerAuthMiddleware = requireRole("buyer");
export const buyerOrSellerAuthMiddleware = requireRole("buyer", "seller");
export const storekeeperAuthMiddleware = requireRole("store_keeper");
