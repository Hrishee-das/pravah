import express from "express";
import * as taxController from "../controllers/taxController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Everyone on the team can look, only the admin can change
router.use(authController.protect, authController.restrictTo("admin", "staff"));

router
  .route("/")
  .get(taxController.getAllTaxes)
  .post(authController.restrictTo("admin"), taxController.createTax);

router
  .route("/:id")
  .get(taxController.getTax)
  .patch(authController.restrictTo("admin"), taxController.updateTax)
  .delete(authController.restrictTo("admin"), taxController.deleteTax);

export default router;
