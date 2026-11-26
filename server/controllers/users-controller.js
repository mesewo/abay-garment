import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const ROLE_VALUES = [
  "admin",
  "buyer",
  "seller",
  "store_keeper",
  "assistance",
  "accountant",
  "factman",
];

/**
 * Builds the user-management handlers for a role. Admins may manage every
 * role; other staff roles may only manage the roles explicitly delegated to
 * them (and never admins or their own role).
 */
export const createUsersController = ({ manageableRoles, visibleRoles }) => {
  const canManage = (actorRole, targetRole) =>
    actorRole === "admin" || manageableRoles.includes(targetRole);

  const loadTarget = async (id) => User.findById(id);

  const getAllUsers = async (req, res) => {
    try {
      const query =
        req.user.role === "admin" ? {} : { role: { $in: visibleRoles } };
      const users = await User.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  const setBlocked = (blocked) => async (req, res) => {
    try {
      const target = await loadTarget(req.params.id);
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (String(target._id) === req.user.id) {
        return res
          .status(400)
          .json({ success: false, message: "You cannot block your own account." });
      }
      if (!canManage(req.user.role, target.role)) {
        return res.status(403).json({
          success: false,
          message: "You cannot manage this user.",
        });
      }

      target.isBlocked = blocked;
      await target.save();

      return res.status(200).json({
        success: true,
        message: `User ${blocked ? "blocked" : "unblocked"} successfully`,
        data: target,
      });
    } catch (error) {
      console.error("Block user error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  const createUser = async (req, res) => {
    const { userName, email, password, role } = req.body;

    try {
      if (!userName || !email || !password || !role) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required." });
      }
      if (!ROLE_VALUES.includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role." });
      }
      if (!canManage(req.user.role, role)) {
        return res.status(403).json({
          success: false,
          message: "You cannot create a user with that role.",
        });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
      }

      const exists = await User.findOne({ email: email.toLowerCase().trim() });
      if (exists) {
        return res.status(409).json({ success: false, message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({
        userName,
        email,
        password: hashedPassword,
        role,
        isEmailVerified: true,
      });

      return res
        .status(201)
        .json({ success: true, message: "User created", user: newUser });
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  const updateUser = async (req, res) => {
    try {
      const target = await loadTarget(req.params.id);
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (!canManage(req.user.role, target.role)) {
        return res
          .status(403)
          .json({ success: false, message: "You cannot manage this user." });
      }

      const { userName, email, role } = req.body;
      if (role !== undefined) {
        if (!ROLE_VALUES.includes(role)) {
          return res.status(400).json({ success: false, message: "Invalid role." });
        }
        if (!canManage(req.user.role, role)) {
          return res
            .status(403)
            .json({ success: false, message: "You cannot assign that role." });
        }
        if (String(target._id) === req.user.id && role !== req.user.role) {
          return res
            .status(400)
            .json({ success: false, message: "You cannot change your own role." });
        }
        target.role = role;
      }
      if (userName) target.userName = userName;
      if (email) target.email = email.toLowerCase().trim();

      await target.save();

      return res
        .status(200)
        .json({ success: true, message: "User updated", data: target });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  const deleteUser = async (req, res) => {
    try {
      const target = await loadTarget(req.params.id);
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (String(target._id) === req.user.id) {
        return res
          .status(400)
          .json({ success: false, message: "You cannot delete your own account." });
      }
      if (!canManage(req.user.role, target.role)) {
        return res
          .status(403)
          .json({ success: false, message: "You cannot manage this user." });
      }

      await target.deleteOne();
      return res
        .status(200)
        .json({ success: true, message: "User deleted", data: target });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };

  return {
    getAllUsers,
    blockUser: setBlocked(true),
    unblockUser: setBlocked(false),
    createUser,
    updateUser,
    deleteUser,
  };
};

export default { createUsersController, ROLE_VALUES };
