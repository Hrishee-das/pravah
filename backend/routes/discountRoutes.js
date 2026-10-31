import express from "express";
import * as discountController from "../controllers/discountController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Everyone on the team can look, only the admin can change
router.use(authController.protect, authController.restrictTo("admin", "staff"));

router
  .route("/")
  .get(discountController.getAllDiscounts)
  .post(authController.restrictTo("admin"), discountController.createDiscount);

router
  .route("/:id")
  .get(discountController.getDiscount)
  .patch(authController.restrictTo("admin"), discountController.updateDiscount)
  .delete(authController.restrictTo("admin"), discountController.deleteDiscount);

export default router;
