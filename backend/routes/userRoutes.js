import express from "express";
import * as userController from "../controllers/userController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete("/deleteMe", userController.deleteMe);

// Only the admin can add a new member of staff
router.post(
  "/staff",
  authController.restrictTo("admin"),
  userController.createStaff,
);

router
  .route("/")
  .get(
    authController.restrictTo("admin", "staff"),
    userController.restrictStaffToCustomers,
    userController.getAllUsers,
  )
  .post(authController.restrictTo("admin"), userController.createUser);

router
  .route("/:id")
  .get(
    authController.restrictTo("admin", "staff"),
    userController.restrictStaffToCustomers,
    userController.getUser,
  )
  .patch(
    authController.restrictTo("admin"),
    userController.filterUserBody,
    userController.updateUser,
  )
  .delete(authController.restrictTo("admin"), userController.deleteUser);

export default router;
