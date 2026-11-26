import { createUsersController } from "../users-controller.js";

// A factory manager can manage operational staff, but never admins, other
// factory managers or accountants (separation of duties).
export const {
  getAllUsers,
  blockUser,
  unblockUser,
  createUser,
  updateUser,
  deleteUser,
} = createUsersController({
  manageableRoles: ["buyer", "seller", "store_keeper", "assistance"],
  visibleRoles: ["buyer", "seller", "store_keeper", "assistance"],
});

export default {
  getAllUsers,
  blockUser,
  unblockUser,
  createUser,
  updateUser,
  deleteUser,
};
