import { createUsersController } from "../users-controller.js";

export const {
  getAllUsers,
  blockUser,
  unblockUser,
  createUser,
  updateUser,
  deleteUser,
} = createUsersController({
  manageableRoles: [
    "buyer",
    "seller",
    "store_keeper",
    "assistance",
    "accountant",
    "factman",
    "admin",
  ],
  visibleRoles: [
    "admin",
    "buyer",
    "seller",
    "store_keeper",
    "assistance",
    "accountant",
    "factman",
  ],
});

export default {
  getAllUsers,
  blockUser,
  unblockUser,
  createUser,
  updateUser,
  deleteUser,
};
