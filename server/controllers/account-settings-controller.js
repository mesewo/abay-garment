import bcrypt from "bcryptjs";
import User from "../models/User.js";

/**
 * Account settings are always applied to the authenticated user. The
 * previous implementations accepted an arbitrary `userId` from the body,
 * which allowed any signed-in user to rename or reset any other account.
 */
export const updateOwnUsername = async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (typeof newUsername !== "string" || newUsername.trim().length < 3) {
      return res
        .status(400)
        .json({ success: false, message: "Username must be at least 3 characters." });
    }

    const userName = newUsername.trim();
    const taken = await User.findOne({
      userName,
      _id: { $ne: req.user.id },
    }).select("_id");

    if (taken) {
      return res
        .status(409)
        .json({ success: false, message: "That username is already taken." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { userName },
      { new: true, runValidators: true }
    ).select("_id userName email role");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Username updated",
      data: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update username error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update username" });
  }
};

export const updateOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Google-only accounts have no password yet, so allow setting one.
    if (user.password) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is required." });
      }
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches) {
        return res
          .status(401)
          .json({ success: false, message: "Current password is incorrect." });
      }
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("Update password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update password" });
  }
};

export default { updateOwnUsername, updateOwnPassword };
