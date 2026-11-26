import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getTokenTtl = () => process.env.JWT_EXPIRES_IN || "7d";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export const signAuthToken = (user) =>
  jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      email: user.email,
      userName: user.userName,
    },
    getSecret(),
    { expiresIn: getTokenTtl() }
  );

export const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

export const clearAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
});

/**
 * Verifies the JWT cookie and loads a fresh copy of the user so that
 * role changes, blocks and deletions take effect immediately.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized user!" });
    }

    const decoded = jwt.verify(token, getSecret());
    const user = await User.findById(decoded.id).select(
      "_id role email userName isBlocked"
    );

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized user!" });
    }

    if (user.isBlocked) {
      return res
        .status(403)
        .json({ success: false, message: "Your account has been blocked." });
    }

    req.user = {
      id: String(user._id),
      _id: String(user._id),
      role: user.role,
      email: user.email,
      userName: user.userName,
    };

    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized user!" });
  }
};

/**
 * requireRole("admin") or requireRole("admin", "accountant")
 */
export const requireRole = (...roles) => {
  const allowed = roles.flat();
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission for this action.",
        });
      }
      return next();
    });
  };
};

export default { signAuthToken, requireAuth, requireRole, authCookieOptions };
