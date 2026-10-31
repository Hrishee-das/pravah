import express from "express";
import * as planController from "../controllers/planController.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// Everyone on the team can look, only the admin can change
router.use(authController.protect, authController.restrictTo("admin", "staff"));

router
  .route("/")
  .get(planController.getAllPlans)
  .post(authController.restrictTo("admin"), planController.createPlan);

router
  .route("/:id")
  .get(planController.getPlan)
  .patch(authController.restrictTo("admin"), planController.updatePlan)
  .delete(authController.restrictTo("admin"), planController.deletePlan);

export default router;
